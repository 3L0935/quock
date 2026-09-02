// Tool-calling registry for the agent flows: the model gets these schemas on /api/chat and we execute each
// tool_call here, feeding results back as tool messages. Adding a tool = one ToolDefinition + one branch.

import type { ApiClient } from "@/lib/api/client";
import type { MemoryRepository } from "@/lib/db/memoryRepository";
import type { DbMemory } from "@/lib/db/types";
import {
  type ChatHistorySearch,
  type ReadChatWindow,
} from "@/lib/db/chatHistorySearch";
import { asChatId, asMemoryId } from "@/lib/types/ids";
import { webFetch, webSearch } from "@/modules/chat/api/webSearch";
import { AGENT_MEMORY_INJECT_MAX } from "@/modules/chat/constants";

// JSON-schema tool definition sent in ChatRequest.tools (mirrors Ollama's Tool shape).
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// A tool call streamed back on /api/chat. Standard Ollama returns arguments as an object (the desktop's proprietary endpoint returns a JSON string instead).
export interface WireToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

// Everything a tool needs at execution time: Ollama-hosted tools use the signed client; local tools use the
// repositories and device APIs. `memories` is null when the database is not ready (defensive; tools then degrade).
export interface ToolContext {
  client: ApiClient;
  memories: MemoryRepository | null;
  chatHistory: ChatHistorySearch | null;
}

const WEB_SEARCH_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web for current, real-world information when the answer may be recent, factual, or beyond the model's training data.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
    },
  },
};

const WEB_FETCH_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "web_fetch",
    description: "Fetch the readable contents of a single web page by its URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The absolute URL to fetch." },
      },
      required: ["url"],
    },
  },
};

// The tool set granted when the user enables web search for a message.
export const WEB_TOOLS: readonly ToolDefinition[] = [
  WEB_SEARCH_TOOL,
  WEB_FETCH_TOOL,
];

const MEMORY_SAVE_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "memory_save",
    description:
      "Save one durable fact, preference, or request to memory for future turns. Use whenever the user states something they want remembered across sessions (name, preferences, devices, goals), not for one-off chat content.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "A single self-contained fact to remember.",
        },
      },
      required: ["content"],
    },
  },
};

const MEMORY_READ_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "memory_read",
    description:
      "Read recently saved memories for this account, optionally filtered by a query. Use before answering questions about the user's preferences, devices, or anything they may have asked to remember.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Optional: only return memories matching any word in this query.",
        },
        limit: {
          type: "number",
          description: "Optional: maximum number of memories to return.",
        },
      },
      required: [],
    },
  },
};

const MEMORY_FORGET_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "memory_forget",
    description:
      "Delete one memory by its id (as returned by memory_read). Use when the user asks to forget something, or when a remembered fact is no longer true.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The id of the memory to delete.",
        },
      },
      required: ["id"],
    },
  },
};

const SEARCH_CHATS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "search_chats",
    description:
      "Search the user's past conversations (stored on this device) for messages matching a keyword. Returns the matching chats with a snippet so you can recall what was said before. Use when the user refers to a previous conversation or asks what was discussed.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword(s) to look for, literally.",
        },
      },
      required: ["query"],
    },
  },
};

const READ_CHAT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "read_chat",
    description:
      "Read a WINDOW of one past conversation by its chatId (from search_chats). Returns ~3 exchanges plus the window bounds; call again with before/after to move through the thread. Default window is the most recent turns.",
    parameters: {
      type: "object",
      properties: {
        chatId: {
          type: "string",
          description: "The chatId from a search_chats result.",
        },
        before: {
          type: "number",
          description:
            "Read the window ENDING just before this turn index (older turns).",
        },
        after: {
          type: "number",
          description:
            "Read the window STARTING at this turn index (newer turns).",
        },
      },
      required: ["chatId"],
    },
  },
};

export const MEMORY_TOOLS: readonly ToolDefinition[] = [
  MEMORY_SAVE_TOOL,
  MEMORY_READ_TOOL,
  MEMORY_FORGET_TOOL,
  SEARCH_CHATS_TOOL,
  READ_CHAT_TOOL,
];

// Agent mode layers the on-device memory + chat-history tools over the web set.
export const AGENT_TOOLS: readonly ToolDefinition[] = [
  ...WEB_TOOLS,
  ...MEMORY_TOOLS,
];

// Reads a string argument off a tool call, tolerating a missing/mistyped value.
function stringArg(call: WireToolCall, key: string): string {
  const value = call.function.arguments[key];
  return typeof value === "string" ? value : "";
}

// Numeric argument, same tolerance: anything but a finite number falls back to the default.
function numberArg(call: WireToolCall, key: string, fallback: number): number {
  const value = call.function.arguments[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// Default and hard ceiling for memory_read: the model's limit arg is clamped to this so one call can never
// materialize the whole table into the context — the same budget the injector enforces.
export const MEMORY_READ_MAX = AGENT_MEMORY_INJECT_MAX;
async function handleMemorySave(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  if (!ctx.memories) {
    return JSON.stringify({ saved: false, error: "storage" });
  }
  const content = stringArg(call, "content").trim();
  if (content.length === 0) {
    return JSON.stringify({ saved: false, error: "empty" });
  }
  try {
    const saved = await ctx.memories.save(content, "model");
    return JSON.stringify({ saved: true, id: saved.id });
  } catch (err) {
    // Never throw out of a memory tool: a failing save must not crash the turn — the model can apologize and move on.
    console.warn("memory_save failed:", err);
    return JSON.stringify({ saved: false, error: "storage" });
  }
}

const MEMORY_READ_NO_TABLE = "No memories stored yet.";
const MEMORY_READ_READ_FAILED =
  "Memory storage could not be read. Tell the user their saved memories are temporarily unavailable.";

async function handleMemoryRead(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  if (!ctx.memories) return MEMORY_READ_NO_TABLE;
  // Clamp both ends of the model-provided limit: above the budget one call would materialize the whole hot set,
  // and at or below zero SQLite reads a negative LIMIT as "no limit" — the opposite of the cap.
  const limit = Math.max(
    1,
    Math.min(numberArg(call, "limit", MEMORY_READ_MAX), MEMORY_READ_MAX),
  );
  const query = stringArg(call, "query");
  let matched: DbMemory[];
  try {
    matched = await ctx.memories.searchRecent(query, limit);
  } catch (err) {
    // A storage failure must not become a confident "you remember nothing" — that is a false statement to the user.
    console.warn("memory_read failed:", err);
    return MEMORY_READ_READ_FAILED;
  }
  if (matched.length === 0) {
    // Distinct answers for "nothing stored" vs "nothing matches": the model reports either as fact.
    return query.trim().length > 0
      ? `No saved memories match "${query.trim()}".`
      : MEMORY_READ_NO_TABLE;
  }
  // Keep hot facts hot: touch only the rows actually returned (a query-filtered read never bumps the rest of the
  // hot set — stamping every match would flatten the ordering the injection ranks on). Fire-and-forget so a
  // failing write never blocks the read result.
  for (const m of matched) {
    ctx.memories.touch(m.id).catch((err: unknown) => {
      console.warn("memory touch failed:", err);
    });
  }
  return JSON.stringify(
    matched.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
    })),
  );
}

async function handleMemoryForget(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  if (!ctx.memories) return "Memory not found.";
  const id = numberArg(call, "id", -1);
  if (id < 0) return `Memory ${id} not found.`;
  try {
    // The repo enforces user scoping: a foreign id returns 0 instead of deleting another account's row.
    const deleted = await ctx.memories.forget(asMemoryId(id));
    return deleted > 0 ? "Deleted." : `Memory ${id} not found.`;
  } catch (err) {
    console.warn("memory_forget failed:", err);
    return `Memory ${id} not found.`;
  }
}

async function handleSearchChats(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  if (!ctx.chatHistory) return "Chat history is unavailable.";
  try {
    const hits = await ctx.chatHistory.searchChats(stringArg(call, "query"));
    if (hits.length === 0) return "No matching past conversations.";
    return JSON.stringify(
      hits.map((h) => ({
        chatId: h.chatId,
        chatTitle: h.chatTitle,
        snippet: h.snippet,
        messageDate: h.messageDate,
      })),
    );
  } catch (err) {
    console.warn("search_chats failed:", err);
    return "Chat history is unavailable.";
  }
}

async function handleReadChat(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  if (!ctx.chatHistory) return "Chat history is unavailable.";
  const chatId = stringArg(call, "chatId");
  if (chatId.length === 0) return "Chat not found.";
  // Window args are optional numbers; anything mistyped falls back to the tail window.
  const beforeRaw = call.function.arguments["before"];
  const afterRaw = call.function.arguments["after"];
  const hasBefore = typeof beforeRaw === "number" && Number.isFinite(beforeRaw);
  const hasAfter = typeof afterRaw === "number" && Number.isFinite(afterRaw);
  const window: ReadChatWindow = hasBefore
    ? { before: beforeRaw as number }
    : hasAfter
      ? { after: afterRaw as number }
      : {};
  try {
    const read = await ctx.chatHistory.readChat(asChatId(chatId), window);
    if (read === null) return "Chat not found.";
    // Echo the bounds so the model can chain before/after without recomputing anything.
    return JSON.stringify(read);
  } catch (err) {
    console.warn("read_chat failed:", err);
    return "Chat not found.";
  }
}

// Executes a model-requested tool and returns its result serialized for the tool message.
export async function executeToolCall(
  ctx: ToolContext,
  call: WireToolCall,
): Promise<string> {
  switch (call.function.name) {
    case "web_search": {
      const results = await webSearch(ctx.client, stringArg(call, "query"));
      return JSON.stringify(results);
    }
    case "web_fetch": {
      const result = await webFetch(ctx.client, stringArg(call, "url"));
      return JSON.stringify(result);
    }
    case "memory_save":
      return handleMemorySave(ctx, call);
    case "memory_read":
      return handleMemoryRead(ctx, call);
    case "memory_forget":
      return handleMemoryForget(ctx, call);
    case "search_chats":
      return handleSearchChats(ctx, call);
    case "read_chat":
      return handleReadChat(ctx, call);
    default:
      return `Tool ${call.function.name} is not available.`;
  }
}
