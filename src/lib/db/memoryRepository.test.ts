import { memoryQueryTokens } from "@/lib/db/memoryRepository";

describe("memoryQueryTokens", () => {
  it("splits the query on whitespace into lowercase tokens", () => {
    expect(memoryQueryTokens("METEOR whoops")).toEqual(["meteor", "whoops"]);
  });

  it("collapses runs of whitespace and drops empty tokens", () => {
    expect(memoryQueryTokens("  a   b  ")).toEqual(["a", "b"]);
  });

  it("returns an empty array for a blank query (the read is unfiltered)", () => {
    expect(memoryQueryTokens("")).toEqual([]);
    expect(memoryQueryTokens("   ")).toEqual([]);
  });
});
