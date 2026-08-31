// Tool-call repository: one persisted row per tool the model executed during an agent turn. Written by the streaming
// pipeline at execution time; read by the bubble's interleaved tool-step list. All queries are parameterised.

import type { SQLiteDatabase } from "expo-sqlite";
import { asChatId, asMessageId, type MessageId } from "@/lib/types/ids";
import type { DbToolCall, ToolCallStatus } from "@/lib/db/types";

interface ToolCallRow {
  message_id: number;
  chat_id: string;
  name: string;
  arguments: string;
  result: string | null;
  status: string;
  round: number;
  content_offset: number;
  created_at: number;
}

function rowToToolCall(row: ToolCallRow): DbToolCall {
  return {
    messageId: asMessageId(row.message_id),
    chatId: asChatId(row.chat_id),
    name: row.name,
    arguments: row.arguments,
    result: row.result,
    status: row.status as ToolCallStatus,
    round: row.round,
    contentOffset: row.content_offset,
    createdAt: row.created_at,
  };
}

export class ToolCallRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  // Fire-and-forget from the pipeline's perspective (awaited, but failures are logged, never streamed): a persist
  // problem must not fail the tool round the model is waiting on. `round` groups the calls of one loop pass.
  async record(input: Omit<DbToolCall, "createdAt">): Promise<void> {
    try {
      await this.db.runAsync(
        "INSERT INTO tool_calls (message_id, chat_id, name, arguments, result, status, round, content_offset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          input.messageId,
          input.chatId,
          input.name,
          input.arguments,
          input.result,
          input.status,
          input.round,
          input.contentOffset,
          Date.now(),
        ],
      );
    } catch (err) {
      console.warn("ToolCallRepository.record failed:", err);
    }
  }

  // Chronological per turn: the bubble shows the steps in the order the model took them.
  async listByMessage(messageId: MessageId): Promise<DbToolCall[]> {
    const rows = await this.db.getAllAsync<ToolCallRow>(
      "SELECT message_id, chat_id, name, arguments, result, status, round, content_offset, created_at FROM tool_calls WHERE message_id = ? ORDER BY content_offset ASC, created_at ASC",
      [messageId],
    );
    return rows.map(rowToToolCall);
  }
}
