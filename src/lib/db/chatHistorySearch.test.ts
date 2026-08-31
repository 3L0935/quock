import { ChatHistorySearch, snippetAround } from "@/lib/db/chatHistorySearch";
import { asChatId } from "@/lib/types/ids";

// expo-sqlite is native (no Jest surface); the fake replays the row shapes the SQL is expected to return and
// captures statements so scoping and parameterisation stay asserted.
function makeFakeDb() {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    db: {
      getFirstAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] });
        return params?.[0] === "chat-1" ? { title: "Drone build" } : null;
      }),
      getAllAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] });
        return [] as never;
      }),
    },
  };
}

describe("ChatHistorySearch", () => {
  it("scopes searchChats to the account, parameterises the LIKE, and orders by recency", async () => {
    const fake = makeFakeDb();
    const search = new ChatHistorySearch(
      fake.db as never,
      (): string => "user-1",
    );
    await search.searchChats("meteor");
    const select = fake.calls.find((c) => c.sql.includes("FROM messages"));
    expect(select).toBeDefined();
    expect(select?.sql).toContain("c.user_id = ?");
    expect(select?.sql).toContain("LIKE ? ESCAPE");
    expect(select?.sql).toContain("ORDER BY m.created_at DESC");
  });

  it("returns no hits for a blank query without touching the database", async () => {
    const fake = makeFakeDb();
    const search = new ChatHistorySearch(
      fake.db as never,
      (): string => "user-1",
    );
    await expect(search.searchChats("   ")).resolves.toEqual([]);
    expect(
      fake.calls.find((c) => c.sql.includes("FROM messages")),
    ).toBeUndefined();
  });

  it("readChat returns null when the chat does not exist or belongs to another account", async () => {
    const fake = makeFakeDb();
    const search = new ChatHistorySearch(
      fake.db as never,
      (): string => "user-1",
    );
    await expect(search.readChat(asChatId("chat-9"))).resolves.toBeNull();
  });

  it("readChat windows from the tail by default and honors before/after", async () => {
    const fake = makeFakeDb();
    fake.db.getAllAsync = jest.fn(async (_sql: string, _params?: unknown[]) => {
      const rows = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `turn ${i}`,
      }));
      return rows as never;
    });
    const search = new ChatHistorySearch(
      fake.db as never,
      (): string => "user-1",
    );
    const tail = await search.readChat(asChatId("chat-1"));
    expect(tail?.totalTurns).toBe(30);
    expect(tail?.windowEnd).toBe(30);
    expect(tail?.turns).toHaveLength(6);
    expect(tail?.turns[0]?.content).toBe("turn 24");

    const before = await search.readChat(asChatId("chat-1"), { before: 24 });
    expect(before?.windowEnd).toBe(24);
    expect(before?.turns[0]?.content).toBe("turn 18");

    const after = await search.readChat(asChatId("chat-1"), { after: 6 });
    expect(after?.windowStart).toBe(6);
    expect(after?.turns[0]?.content).toBe("turn 6");
  });

  it("clamps long turns and marks the cut", async () => {
    const fake = makeFakeDb();
    fake.db.getAllAsync = jest.fn(
      async (_sql: string, _params?: unknown[]) =>
        [
          {
            role: "user",
            content: "a".repeat(600),
          },
        ] as never,
    );
    const search = new ChatHistorySearch(
      fake.db as never,
      (): string => "user-1",
    );
    const read = await search.readChat(asChatId("chat-1"));
    expect(read?.turns[0]?.content).toMatch(/…$/);
    expect(read?.turns[0]?.content.length).toBeLessThanOrEqual(401);
  });
});

describe("snippetAround", () => {
  it("centers the window on the match with ellipses at the cuts", () => {
    const long = `x${"y".repeat(300)} target ${"z".repeat(300)}`;
    const out = snippetAround(long, "target");
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
    expect(out).toContain("target");
  });

  it("returns the whole string when it fits", () => {
    expect(snippetAround("short text", "text")).toBe("short text");
  });

  it("is case-insensitive on the match position", () => {
    const out = snippetAround("prefix TARGETruna", "target");
    expect(out).toContain("TARGET");
  });
});
