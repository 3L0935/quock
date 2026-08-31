// Chat-history search for the agent: keyword lookup across every past conversation of the account, plus a
// windowed read-back of one conversation. Local SQLite only (LIKE query, no embeddings), scoped like every
// repository by the signed-in account.

import type { SQLiteDatabase } from "expo-sqlite";
import type { ChatId } from "@/lib/types/ids";

const SNIPPET_CHARS = 160;
const SEARCH_MAX_HITS = 12;
// Turns per read window: ~3 exchanges, enough context to decide "keep scrolling" versus done.
const READ_WINDOW_TURNS = 6;
const READ_TURN_MAX_CHARS = 400;

export interface ChatSearchHit {
  chatId: string;
  chatTitle: string;
  messageDate: number;
  // One flat line centered on the match, ellipsis-marked where it was cut.
  snippet: string;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryRead {
  title: string;
  turns: ChatHistoryTurn[];
  // Window position within the conversation: 0-based inclusive turn indices of this window [start, end).
  windowStart: number;
  windowEnd: number;
  totalTurns: number;
}

export interface ReadChatWindow {
  // "before" takes the window ending at this 0-based exclusive index; "after" starts at it. Omitted reads the
  // TAIL (the most recent turns).
  before?: number;
  after?: number;
}

interface SearchRow {
  chat_id: string;
  chat_title: string;
  content: string;
  created_at: number;
}

interface HistoryRow {
  role: string;
  content: string;
}

// Escapes LIKE wildcards so a query containing % or _ matches literally.
function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, "\\$&");
}

// Single-window context: chars before the first match + the match + chars after, as one flat snippet.
// Exported for tests: the window math is where a regression would hide.
export function snippetAround(content: string, lowerQuery: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= SNIPPET_CHARS) {
    return singleLine;
  }
  const idx = singleLine.toLowerCase().indexOf(lowerQuery);
  if (idx === -1) {
    return `${singleLine.slice(0, SNIPPET_CHARS)}…`;
  }
  const half = SNIPPET_CHARS / 2;
  const start = Math.max(0, idx - half);
  const end = Math.min(singleLine.length, idx + lowerQuery.length + half);
  const body = singleLine.slice(start, end);
  return `${start > 0 ? "…" : ""}${body}${end < singleLine.length ? "…" : ""}`;
}

export class ChatHistorySearch {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly getUserId: () => string,
  ) {}

  // LIKE across every user/assistant message of the account, joined to the chat for its title. Relevance is
  // recency (newest message first) — a keyword scan needs no ranking model to be useful.
  async searchChats(query: string): Promise<ChatSearchHit[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const userId = this.getUserId();
    const rows = await this.db.getAllAsync<SearchRow>(
      `
      SELECT c.id AS chat_id, c.title AS chat_title, m.content AS content, m.created_at AS created_at
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ? AND m.role IN ('user', 'assistant') AND m.content LIKE ? ESCAPE '\\'
      ORDER BY m.created_at DESC
      LIMIT ?
      `,
      [userId, `%${escapeLike(trimmed)}%`, SEARCH_MAX_HITS],
    );
    const lowerQuery = trimmed.toLowerCase();
    return rows.map((row) => ({
      chatId: row.chat_id,
      chatTitle: row.chat_title,
      messageDate: row.created_at,
      snippet: snippetAround(row.content, lowerQuery),
    }));
  }

  // Returns ONE window of turns; the caller walks the conversation with ReadChatWindow before/after instead of
  // ever holding the whole thread. Tool rows are skipped: they are pipeline plumbing, not dialogue.
  async readChat(
    chatId: ChatId,
    window: ReadChatWindow = {},
  ): Promise<ChatHistoryRead | null> {
    const userId = this.getUserId();
    const head = await this.db.getFirstAsync<{ title: string }>(
      "SELECT title FROM chats WHERE id = ? AND user_id = ?",
      [chatId, userId],
    );
    if (head === null) return null;
    const rows = await this.db.getAllAsync<HistoryRow>(
      `
      SELECT m.role AS role, m.content AS content
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.id = ? AND c.user_id = ? AND m.role IN ('user', 'assistant')
      ORDER BY m.created_at ASC, m.id ASC
      `,
      [chatId, userId],
    );
    if (rows.length === 0) return null;
    const totalTurns = rows.length;
    const clamp = (v: number): number =>
      Math.min(Math.max(0, Math.round(v)), totalTurns);
    let start: number;
    if (window.before !== undefined) {
      start = clamp(window.before - READ_WINDOW_TURNS);
    } else if (window.after !== undefined) {
      start = clamp(window.after);
    } else {
      // Default window: the TAIL (where the conversation currently stands).
      start = Math.max(0, totalTurns - READ_WINDOW_TURNS);
    }
    const end = Math.min(totalTurns, start + READ_WINDOW_TURNS);
    return {
      title: head.title,
      turns: rows.slice(start, end).map((row) => ({
        role:
          row.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content:
          row.content.length > READ_TURN_MAX_CHARS
            ? `${row.content.slice(0, READ_TURN_MAX_CHARS)}…`
            : row.content,
      })),
      windowStart: start,
      windowEnd: end,
      totalTurns,
    };
  }
}
