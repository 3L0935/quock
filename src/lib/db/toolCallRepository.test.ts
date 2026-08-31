import { ToolCallRepository } from "@/lib/db/toolCallRepository";
import { asChatId, asMessageId } from "@/lib/types/ids";

// expo-sqlite is a native module (no Jest surface — see AGENTS.md: repositories are covered by Maestro E2E), so this
// fake replays the one SQL behaviour the repository depends on: ordered SELECT rows and a logged-not-thrown write failure.
interface CapturedStatement {
  sql: string;
  params: unknown[];
}

function makeFakeDb() {
  const statements: CapturedStatement[] = [];
  const rows: Record<string, unknown>[] = [];
  return {
    statements,
    rows,
    db: {
      runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        statements.push({ sql, params: params ?? [] });
        return { changes: 1, lastInsertRowId: 1 };
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        statements.push({ sql, params: [] });
        return rows as never;
      }),
    },
  };
}

const CHAT_ID = asChatId("chat-1");

function recordedCall(
  repo: ToolCallRepository,
  args: Partial<Parameters<ToolCallRepository["record"]>[0]> = {},
): Promise<void> {
  return repo.record({
    messageId: asMessageId(1),
    chatId: CHAT_ID,
    name: "web_search",
    arguments: JSON.stringify({ query: "quock" }),
    result: "[1] result",
    status: "complete",
    round: 0,
    ...args,
  });
}

describe("ToolCallRepository", () => {
  it("inserts one row with the JSON arguments, status and round", async () => {
    const fake = makeFakeDb();
    const repo = new ToolCallRepository(fake.db as never);
    await recordedCall(repo);
    const insert = fake.statements.find((s) => s.sql.startsWith("INSERT"));
    expect(insert).toBeDefined();
    expect(insert?.params).toEqual([
      1,
      CHAT_ID,
      "web_search",
      JSON.stringify({ query: "quock" }),
      "[1] result",
      "complete",
      0,
      expect.any(Number),
    ]);
  });

  it("maps the SELECT with typed ids and chronological order", async () => {
    const fake = makeFakeDb();
    fake.rows.push(
      {
        message_id: 2,
        chat_id: "chat-1",
        name: "web_fetch",
        arguments: "{}",
        result: "r",
        status: "complete",
        round: 1,
        created_at: 20,
      },
      {
        message_id: 1,
        chat_id: "chat-1",
        name: "web_search",
        arguments: "{}",
        result: "r",
        status: "failed",
        round: 0,
        created_at: 10,
      },
    );
    const repo = new ToolCallRepository(fake.db as never);
    const calls = await repo.listByMessage(asMessageId(1));
    // The fake returns rows in arbitrary DB order; the repo maps, the SQL orders. Assert the mapping shape.
    expect(calls).toHaveLength(2);
    expect(calls[1].messageId).toBe(asMessageId(1));
    expect(calls[1].chatId).toBe(CHAT_ID);
    expect(calls[1].status).toBe("failed");
  });

  it("lists with a message-scoped, ordered SELECT", async () => {
    const fake = makeFakeDb();
    const repo = new ToolCallRepository(fake.db as never);
    await repo.listByMessage(asMessageId(7));
    const select = fake.statements.find((s) => s.sql.startsWith("SELECT"));
    expect(select?.sql).toContain("WHERE message_id = ?");
    expect(select?.sql).toContain("ORDER BY created_at ASC");
  });

  it("logs and swallows a write failure so the tool round the model awaits never rejects", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const brokenDb = {
      runAsync: jest.fn().mockRejectedValue(new Error("disk full")),
    };
    const repo = new ToolCallRepository(brokenDb as never);
    await expect(recordedCall(repo)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
