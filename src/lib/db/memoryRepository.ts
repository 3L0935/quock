// Memory repository: durable facts the agent saves, scoped per account like chats. The injection ordering ranks by
// recency plus access frequency (last_accessed_at bumps on every read that returns a row), so hot facts stay hot.

import type { SQLiteDatabase } from "expo-sqlite";
import { asMemoryId, type MemoryId } from "@/lib/types/ids";
import type { DbMemory } from "@/lib/db/types";

interface MemoryRow {
  id: number;
  user_id: string;
  content: string;
  created_at: number;
  updated_at: number;
  last_accessed_at: number;
  source: string | null;
}

function rowToMemory(row: MemoryRow): DbMemory {
  return {
    id: asMemoryId(row.id),
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
    source: row.source,
  };
}

export class MemoryRepository {
  // Same live-getter pattern as ChatRepository: the signed-in account id scopes every query, read per-call so a
  // sign-in/out needs no rebuild. A memory belongs to the account, not the device.
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly getUserId: () => string,
  ) {}

  async save(content: string, source?: string): Promise<DbMemory> {
    const userId = this.getUserId();
    const now = Date.now();
    const result = await this.db.runAsync(
      "INSERT INTO memories (user_id, content, created_at, updated_at, last_accessed_at, source) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, content, now, now, now, source ?? null],
    );
    return {
      id: asMemoryId(result.lastInsertRowId),
      userId,
      content,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      source: source ?? null,
    };
  }

  // Hottest-first for injection; an optional query filters in SQL so a match sitting beyond any page is still
  // reachable — an in-memory filter after LIMIT would make it invisible no matter what the model searches.
  async searchRecent(query: string, limit: number): Promise<DbMemory[]> {
    const userId = this.getUserId();
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    // No meaningful tokens means unfiltered; a negative limit would read as "no limit" in SQLite.
    if (tokens.length === 0 || limit <= 0) {
      const capped = Math.max(0, limit);
      const rows = await this.db.getAllAsync<MemoryRow>(
        "SELECT id, user_id, content, created_at, updated_at, last_accessed_at, source FROM memories WHERE user_id = ? ORDER BY last_accessed_at DESC, id DESC LIMIT ?",
        [userId, capped],
      );
      return rows.map(rowToMemory);
    }
    const predicates = tokens.map(() => "content LIKE ?").join(" OR ");
    const params = tokens.map((t) => `%${t}%`);
    const rows = await this.db.getAllAsync<MemoryRow>(
      `SELECT id, user_id, content, created_at, updated_at, last_accessed_at, source FROM memories WHERE user_id = ? AND (${predicates}) ORDER BY last_accessed_at DESC, id DESC LIMIT ?`,
      [userId, ...params, limit],
    );
    return rows.map(rowToMemory);
  }

  // Every memory for the account, for the management UI (which has no injection budget to respect).
  async list(): Promise<DbMemory[]> {
    const userId = this.getUserId();
    const rows = await this.db.getAllAsync<MemoryRow>(
      "SELECT id, user_id, content, created_at, updated_at, last_accessed_at, source FROM memories WHERE user_id = ? ORDER BY last_accessed_at DESC, id DESC",
      [userId],
    );
    return rows.map(rowToMemory);
  }

  // Marks a memory as used now, keeping injected facts hot in the ordering. Scoped like every other write: a foreign
  // id must never be bumpable, so the account predicate matches forget().
  async touch(id: MemoryId): Promise<void> {
    await this.db.runAsync(
      "UPDATE memories SET last_accessed_at = ? WHERE id = ? AND user_id = ?",
      [Date.now(), id, this.getUserId()],
    );
  }

  // Scoped delete: returns 0 for a foreign id, so the tool can say "not found" without leaking another account's rows.
  async forget(id: MemoryId): Promise<number> {
    const result = await this.db.runAsync(
      "DELETE FROM memories WHERE id = ? AND user_id = ?",
      [id, this.getUserId()],
    );
    return result.changes;
  }

  async clearAll(): Promise<void> {
    await this.db.runAsync("DELETE FROM memories WHERE user_id = ?", [
      this.getUserId(),
    ]);
  }
}

// Query tokens for the SQL LIKE filter: lowercase whitespace-split. Empty means the read is unfiltered.
export function memoryQueryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}
