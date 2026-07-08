// Prompt templates for the excerpt actions — each is sent to the same chat as a fresh user turn that operates
// on the block the user long-pressed in a previous reply.

// Ask the model to expand on the picked block in more depth.
export function deepDivePrompt(excerpt: string): string {
  return `Take this excerpt from your previous reply and expand on it in depth — add detail, reasoning, concrete examples, and any important caveats:\n\n"${excerpt}"`;
}

// Ask the model to web-search the picked block and answer with current, sourced information.
export function webSearchPrompt(excerpt: string): string {
  return `Using web search, find current and authoritative information on the following and give an updated, well-sourced summary:\n\n"${excerpt}"`;
}
