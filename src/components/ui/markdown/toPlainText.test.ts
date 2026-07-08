import { markdownToPlainText } from "@/components/ui/markdown/toPlainText";

describe("markdownToPlainText", () => {
  it("strips inline styling but keeps the words", () => {
    expect(markdownToPlainText("**bold** and *italic* and `code`")).toBe(
      "bold and italic and code",
    );
  });

  it("drops heading hashes", () => {
    expect(markdownToPlainText("### 29. Spaghetti al sugo")).toBe(
      "29. Spaghetti al sugo",
    );
  });

  it("keeps bullet lists as separate lines with a marker", () => {
    expect(markdownToPlainText("- pasta\n- tonno\n- basilico")).toBe(
      "• pasta\n• tonno\n• basilico",
    );
  });

  it("keeps ordered lists numbered from their start", () => {
    expect(markdownToPlainText("3. first\n4. second")).toBe(
      "3. first\n4. second",
    );
  });

  it("separates blocks with a blank line so structure survives", () => {
    const md = "# Ricette\n\n1. Pasta al sugo\n2. Pasta al pesto";
    expect(markdownToPlainText(md)).toBe(
      "Ricette\n\n1. Pasta al sugo\n2. Pasta al pesto",
    );
  });

  it("preserves fenced code verbatim", () => {
    expect(markdownToPlainText("```js\nconst a = 1;\n```")).toBe("const a = 1;");
  });
});
