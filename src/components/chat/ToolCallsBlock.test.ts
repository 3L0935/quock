import { splitContentAroundCalls } from "@/components/chat/ToolCallsBlock";
import type { DbToolCall } from "@/lib/db/types";
import { asChatId, asMessageId } from "@/lib/types/ids";

// expo-sqlite is native (no Jest surface) and components are Maestro-covered, so the unit coverage concentrates on
// the pure segment splitter — the piece where an ordering or clamping regression would hide.

function call(
  name: string,
  contentOffset: number,
  status: "complete" | "failed" = "complete",
): DbToolCall {
  return {
    messageId: asMessageId(1),
    chatId: asChatId("chat-1"),
    name,
    arguments: JSON.stringify({ query: "meteor" }),
    result: "[1] ok",
    status,
    round: 0,
    contentOffset,
    createdAt: 1,
  };
}

describe("splitContentAroundCalls", () => {
  it("splits the content at each persisted offset, in offset order", () => {
    const segments = splitContentAroundCalls("firstsecondthird", [
      call("web_search", 5),
      call("web_fetch", 11),
    ]);
    expect(segments.map((s) => s.text)).toEqual(["first", "second", "third"]);
    expect(segments[0]?.calls[0]?.name).toBe("web_search");
    expect(segments[1]?.calls[0]?.name).toBe("web_fetch");
    expect(segments[2]?.calls).toHaveLength(0);
  });

  it("clamps offsets past the content end and still renders the step", () => {
    const segments = splitContentAroundCalls("short", [
      call("memory_save", 100),
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.text).toBe("short");
    expect(segments[0]?.calls[0]?.name).toBe("memory_save");
    expect(segments[1]?.text).toBe("");
  });

  it("keeps a zero-offset step above the answer", () => {
    const segments = splitContentAroundCalls("answer", [
      call("get_current_time", 0),
    ]);
    expect(segments[0]?.text).toBe("");
    expect(segments[0]?.calls).toHaveLength(1);
    expect(segments[1]?.text).toBe("answer");
  });

  it("produces one trailing segment when there are no calls", () => {
    const segments = splitContentAroundCalls("plain", []);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe("plain");
    expect(segments[0]?.calls).toHaveLength(0);
  });
});
