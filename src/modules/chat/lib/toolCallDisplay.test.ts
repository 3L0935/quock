import {
  isKnownToolName,
  toolCallTerm,
} from "@/modules/chat/lib/toolCallDisplay";

describe("isKnownToolName", () => {
  it("recognizes every tool the agent registry grants", () => {
    for (const name of [
      "web_search",
      "web_fetch",
      "memory_save",
      "memory_read",
      "memory_forget",
    ]) {
      expect(isKnownToolName(name)).toBe(true);
    }
  });

  it("returns false for unknown tools so the UI falls back to the raw name", () => {
    expect(isKnownToolName("quantum_entangle")).toBe(false);
  });
});

describe("toolCallTerm", () => {
  it("extracts the query/url/content/text/name precedence term", () => {
    expect(toolCallTerm(JSON.stringify({ query: "quock" }))).toBe("quock");
    expect(toolCallTerm(JSON.stringify({ url: "https://x.dev" }))).toBe(
      "https://x.dev",
    );
    expect(toolCallTerm(JSON.stringify({ content: "likes tea" }))).toBe(
      "likes tea",
    );
    expect(toolCallTerm(JSON.stringify({ text: "hi", name: "f.txt" }))).toBe(
      "hi",
    );
    expect(toolCallTerm(JSON.stringify({ name: "f.txt" }))).toBe("f.txt");
  });

  it("returns empty for malformed JSON or non-string terms rather than throwing into the render path", () => {
    expect(toolCallTerm("not json")).toBe("");
    expect(toolCallTerm(JSON.stringify({ query: 42 }))).toBe("");
    expect(toolCallTerm(JSON.stringify(null))).toBe("");
  });
});
