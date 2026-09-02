import type { ApiClient } from "@/lib/api/client";
import type { MemoryRepository } from "@/lib/db/memoryRepository";
import type { ChatHistorySearch } from "@/lib/db/chatHistorySearch";
import type { DbMemory } from "@/lib/db/types";
import { asChatId, asMemoryId } from "@/lib/types/ids";
import {
  executeToolCall,
  MEMORY_READ_MAX,
  type WireToolCall,
} from "@/modules/chat/lib/tools";
import { webFetch, webSearch } from "@/modules/chat/api/webSearch";

jest.mock("@/modules/chat/api/webSearch", () => ({
  webSearch: jest.fn(),
  webFetch: jest.fn(),
}));

const mockWebSearch = webSearch as jest.MockedFunction<typeof webSearch>;
const mockWebFetch = webFetch as jest.MockedFunction<typeof webFetch>;

// The client is opaque here — executeToolCall only forwards it to the (mocked) API helpers.
const client = { id: "sentinel" } as unknown as ApiClient;
const chatHistory = {
  searchChats: jest.fn(),
  readChat: jest.fn(),
} as unknown as ChatHistorySearch;

// Single construction point: a new ToolContext dependency only touches this helper, not every call.
function ctxWith(
  overrides: Partial<Parameters<typeof executeToolCall>[0]> = {},
) {
  return { client, memories: null, chatHistory, ...overrides };
}

function call(name: string, args: Record<string, unknown>): WireToolCall {
  return { function: { name, arguments: args } };
}

function dbMem(id: number, content: string): DbMemory {
  return {
    id: asMemoryId(id),
    userId: "u1",
    content,
    createdAt: id,
    updatedAt: id,
    lastAccessedAt: id,
    source: "model",
  };
}

describe("executeToolCall", () => {
  const memories = {
    save: jest.fn(),
    searchRecent: jest.fn(),
    touch: jest.fn(),
    forget: jest.fn(),
  } as unknown as MemoryRepository;

  beforeEach(() => {
    mockWebSearch.mockReset();
    mockWebFetch.mockReset();
    memories.save = jest.fn();
    memories.searchRecent = jest.fn();
    // touch.fire-and-forget's .catch() requires a real Promise, not an undefined-returning mock.
    memories.touch = jest.fn().mockResolvedValue(undefined);
    memories.forget = jest.fn();
  });

  it("routes web_search to webSearch and serializes the result list", async () => {
    const results = [{ title: "T", url: "https://x", content: "body" }];
    mockWebSearch.mockResolvedValue(results);

    const out = await executeToolCall(
      ctxWith(),
      call("web_search", { query: "rust async" }),
    );

    expect(mockWebSearch).toHaveBeenCalledWith(client, "rust async");
    expect(mockWebFetch).not.toHaveBeenCalled();
    expect(out).toBe(JSON.stringify(results));
  });

  it("routes web_fetch to webFetch and serializes the page result", async () => {
    const page = { title: "Page", content: "readable", links: ["https://a"] };
    mockWebFetch.mockResolvedValue(page);

    const out = await executeToolCall(
      ctxWith(),
      call("web_fetch", { url: "https://example.com" }),
    );

    expect(mockWebFetch).toHaveBeenCalledWith(client, "https://example.com");
    expect(mockWebSearch).not.toHaveBeenCalled();
    expect(out).toBe(JSON.stringify(page));
  });

  it("falls back to an empty string when the argument is missing or mistyped", async () => {
    mockWebSearch.mockResolvedValue([]);

    await executeToolCall(ctxWith(), call("web_search", {}));
    expect(mockWebSearch).toHaveBeenLastCalledWith(client, "");

    await executeToolCall(ctxWith(), call("web_search", { query: 42 }));
    expect(mockWebSearch).toHaveBeenLastCalledWith(client, "");
  });

  it("returns a not-available message for an unknown tool without touching the API", async () => {
    const out = await executeToolCall(ctxWith(), call("delete_everything", {}));

    expect(out).toBe("Tool delete_everything is not available.");
    expect(mockWebSearch).not.toHaveBeenCalled();
    expect(mockWebFetch).not.toHaveBeenCalled();
  });

  it("memory_save trims the content and returns the saved id", async () => {
    (memories.save as jest.Mock).mockResolvedValue(dbMem(7, "drone"));
    const out = await executeToolCall(
      ctxWith({ memories }),
      call("memory_save", { content: "  drone  " }),
    );
    expect(memories.save).toHaveBeenCalledWith("drone", "model");
    expect(out).toBe(JSON.stringify({ saved: true, id: 7 }));
  });

  it("memory_save reports storage failure as a non-throwing result", async () => {
    (memories.save as jest.Mock).mockRejectedValue(new Error("disk"));
    const out = await executeToolCall(
      ctxWith({ memories }),
      call("memory_save", { content: "fact" }),
    );
    expect(out).toBe(JSON.stringify({ saved: false, error: "storage" }));
  });

  it("memory_read filters by query in the repository, touches hits, and serializes id/content/createdAt", async () => {
    (memories.searchRecent as jest.Mock).mockResolvedValue([
      dbMem(1, "drone is a Meteor75 Pro"),
    ]);
    const out = await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", { query: "drone" }),
    );
    expect(memories.searchRecent).toHaveBeenCalledWith(
      "drone",
      MEMORY_READ_MAX,
    );
    expect(memories.touch).toHaveBeenCalledWith(asMemoryId(1));
    expect(memories.touch).not.toHaveBeenCalledWith(asMemoryId(2));
    expect(out).toBe(
      JSON.stringify([
        { id: 1, content: "drone is a Meteor75 Pro", createdAt: 1 },
      ]),
    );
  });

  it("memory_read without a query reads the unfiltered hot set", async () => {
    (memories.searchRecent as jest.Mock).mockResolvedValue([dbMem(3, "tea")]);
    await executeToolCall(ctxWith({ memories }), call("memory_read", {}));
    expect(memories.searchRecent).toHaveBeenCalledWith("", MEMORY_READ_MAX);
  });

  it("memory_read answers no-match distinctly from an empty table, and never touches on a miss", async () => {
    (memories.searchRecent as jest.Mock).mockResolvedValue([]);
    const missed = await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", { query: "submarine" }),
    );
    expect(missed).toBe('No saved memories match "submarine".');

    const empty = await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", {}),
    );
    expect(empty).toBe("No memories stored yet.");
    expect(memories.touch).not.toHaveBeenCalled();
  });

  it("memory_read clamps the model-provided limit on both ends", async () => {
    (memories.searchRecent as jest.Mock).mockResolvedValue([]);
    await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", { limit: 1e9 }),
    );
    expect((memories.searchRecent as jest.Mock).mock.calls[0][1]).toBe(
      MEMORY_READ_MAX,
    );

    await executeToolCall(ctxWith({ memories }), call("memory_read", {}));
    expect((memories.searchRecent as jest.Mock).mock.calls[1][1]).toBe(
      MEMORY_READ_MAX,
    );

    // A non-positive limit must never reach SQLite: LIMIT -1 reads as "no limit" there.
    await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", { limit: -5 }),
    );
    expect((memories.searchRecent as jest.Mock).mock.calls[2][1]).toBe(1);
  });

  it("memory_read reports a storage failure instead of a confident empty answer", async () => {
    (memories.searchRecent as jest.Mock).mockRejectedValue(new Error("disk"));
    const out = await executeToolCall(
      ctxWith({ memories }),
      call("memory_read", { query: "drone" }),
    );
    expect(out).toBe(
      "Memory storage could not be read. Tell the user their saved memories are temporarily unavailable.",
    );
    expect(memories.touch).not.toHaveBeenCalled();
  });

  it("memory_read degrades gracefully when the repository is unavailable", async () => {
    const out = await executeToolCall(ctxWith(), call("memory_read", {}));
    expect(out).toBe("No memories stored yet.");
  });

  it("memory_forget returns Deleted (id scoped by the repo) and Not found for 0 deletes", async () => {
    (memories.forget as jest.Mock).mockResolvedValue(1);
    const ok = await executeToolCall(
      ctxWith({ memories }),
      call("memory_forget", { id: 3 }),
    );
    expect(memories.forget).toHaveBeenCalledWith(asMemoryId(3));
    expect(ok).toBe("Deleted.");

    (memories.forget as jest.Mock).mockResolvedValue(0);
    const missing = await executeToolCall(
      ctxWith({ memories }),
      call("memory_forget", { id: 99 }),
    );
    expect(missing).toBe("Memory 99 not found.");
  });

  it("search_chats serializes hits and never throws on a repository failure", async () => {
    const hits = [
      {
        chatId: "chat-1",
        chatTitle: "Drone build",
        snippet: "…meteor frame…",
        messageDate: 123,
      },
    ];
    (chatHistory.searchChats as jest.Mock).mockResolvedValue(hits);
    const out = await executeToolCall(
      ctxWith(),
      call("search_chats", { query: "meteor" }),
    );
    expect(chatHistory.searchChats).toHaveBeenCalledWith("meteor");
    expect(out).toBe(JSON.stringify(hits));

    (chatHistory.searchChats as jest.Mock).mockRejectedValue(new Error("disk"));
    const failed = await executeToolCall(
      ctxWith(),
      call("search_chats", { query: "meteor" }),
    );
    expect(failed).toBe("Chat history is unavailable.");
  });

  it("search_chats answers no-match without an error string", async () => {
    (chatHistory.searchChats as jest.Mock).mockResolvedValue([]);
    const out = await executeToolCall(
      ctxWith(),
      call("search_chats", { query: "nothing" }),
    );
    expect(out).toBe("No matching past conversations.");
  });

  it("read_chat forwards the window (before/after) and echoes the bounds", async () => {
    const read = {
      title: "Drone build",
      turns: [{ role: "user", content: "turn 18" }],
      windowStart: 18,
      windowEnd: 24,
      totalTurns: 30,
    };
    (chatHistory.readChat as jest.Mock).mockResolvedValue(read);
    const out = await executeToolCall(
      ctxWith(),
      call("read_chat", { chatId: "chat-1", before: 24 }),
    );
    expect(chatHistory.readChat).toHaveBeenCalledWith(asChatId("chat-1"), {
      before: 24,
    });
    expect(out).toBe(JSON.stringify(read));
  });

  it("read_chat falls back to the tail window on mistyped bounds and reports a foreign chat as not found", async () => {
    (chatHistory.readChat as jest.Mock).mockClear();
    (chatHistory.readChat as jest.Mock).mockResolvedValue({
      title: "t",
      turns: [],
      windowStart: 0,
      windowEnd: 0,
      totalTurns: 0,
    });
    await executeToolCall(
      ctxWith(),
      call("read_chat", { chatId: "chat-1", before: "ninety" }),
    );
    // "ninety" is not a number -> no window -> the default tail read.
    expect(chatHistory.readChat).toHaveBeenCalledWith(asChatId("chat-1"), {});

    (chatHistory.readChat as jest.Mock).mockResolvedValue(null);
    const missing = await executeToolCall(
      ctxWith(),
      call("read_chat", { chatId: "chat-9" }),
    );
    expect(missing).toBe("Chat not found.");
  });

  it("history tools degrade to an unavailable note without a repository", async () => {
    const outSearch = await executeToolCall(
      ctxWith({ chatHistory: null }),
      call("search_chats", { query: "x" }),
    );
    expect(outSearch).toBe("Chat history is unavailable.");
    const outRead = await executeToolCall(
      ctxWith({ chatHistory: null }),
      call("read_chat", { chatId: "chat-1" }),
    );
    expect(outRead).toBe("Chat history is unavailable.");
  });
});
