import { resolveExcerpt } from "@/modules/chat/lib/excerptSelection";
import { groupIntoUnits } from "@/components/ui/markdown/groupIntoUnits";
import { parseMarkdown } from "@/components/ui/markdown/parseMarkdown";
import { asMessageId } from "@/lib/types/ids";

const CONTENT = "## Caveats\n\nMind the gap.\n";
const messages = [{ id: asMessageId(42), content: CONTENT }];

function firstKey(source: string): string {
  const unit = groupIntoUnits(parseMarkdown(source))[0];
  return "itemKeys" in unit ? unit.itemKeys[0] : unit.key;
}

describe("resolveExcerpt", () => {
  it("resolves the composite key to the unit's text", () => {
    expect(resolveExcerpt(messages, `42:${firstKey(CONTENT)}`)).toContain(
      "Mind the gap.",
    );
  });

  it("returns empty when the message is gone", () => {
    expect(resolveExcerpt(messages, `99:${firstKey(CONTENT)}`)).toBe("");
  });

  it("returns empty for a malformed key", () => {
    expect(resolveExcerpt(messages, "no-separator")).toBe("");
  });
});
