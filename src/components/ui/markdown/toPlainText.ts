// Flattens the markdown AST to plain, readable text: drops inline styling (bold/italic/code marks, heading hashes)
// but keeps structure (line breaks, list bullets/numbers) so a long reply stays legible to read and select.

import {
  type BlockNode,
  type InlineNode,
  parseMarkdown,
} from "@/components/ui/markdown/parseMarkdown";

// Every inline node carries the raw `value`; concatenating them drops the styling and keeps the words.
export function inlineToPlainText(nodes: InlineNode[]): string {
  return nodes.map((n) => n.value).join("");
}

export function blockToPlainText(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return inlineToPlainText(node.children);
    case "code":
      return node.value;
    case "list":
      return node.items.map((item) => `• ${inlineToPlainText(item)}`).join("\n");
    case "orderedList":
      return node.items
        .map((item, idx) => `${node.start + idx}. ${inlineToPlainText(item)}`)
        .join("\n");
    case "blockquote":
      return node.children.map(blockToPlainText).join("\n\n");
    case "rule":
      return "———";
    case "table":
      return [node.headers, ...node.rows]
        .map((row) => row.map(inlineToPlainText).join("\t"))
        .join("\n");
  }
}

// Blocks are separated by a blank line so paragraphs, headings and lists stay visually apart.
export function markdownToPlainText(source: string): string {
  return parseMarkdown(source)
    .map(blockToPlainText)
    .filter((block) => block.length > 0)
    .join("\n\n");
}
