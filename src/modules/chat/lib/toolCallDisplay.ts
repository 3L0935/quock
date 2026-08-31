// Tool-call display metadata for the bubble's step list: keyed by wire name so the row says "Search" instead of
// "web_search". Pure strings only — this file runs under Jest (unlike the components), so icon mapping lives in
// ToolCallsBlock. Falls back to the raw name for anything unrecognized (or future tools).

export interface ToolCallDisplay {
  label: string;
  // Past-tense summary for the collapsed history row ("Searched the web", "Saved to memory").
  summary: string;
}

const TOOL_DISPLAYS: Record<string, ToolCallDisplay> = {
  web_search: {
    label: "Web search",
    summary: "Searched the web",
  },
  web_fetch: {
    label: "Fetch page",
    summary: "Fetched a web page",
  },
  memory_save: {
    label: "Save memory",
    summary: "Saved to memory",
  },
  memory_read: {
    label: "Read memory",
    summary: "Read memories",
  },
  memory_forget: {
    label: "Forget memory",
    summary: "Deleted a memory",
  },
  get_current_time: {
    label: "Check time",
    summary: "Checked the time",
  },
  copy_to_clipboard: {
    label: "Copy",
    summary: "Copied to clipboard",
  },
  share_text: {
    label: "Share",
    summary: "Opened the share sheet",
  },
  open_url: {
    label: "Open link",
    summary: "Opened a link",
  },
  get_device_info: {
    label: "Device info",
    summary: "Read device info",
  },
  save_file: {
    label: "Save file",
    summary: "Saved a file",
  },
  read_saved_file: {
    label: "Read file",
    summary: "Read a saved file",
  },
  list_saved_files: {
    label: "List files",
    summary: "Listed saved files",
  },
};

const FALLBACK_LABEL = "Tool";

export function toolCallDisplay(name: string): ToolCallDisplay {
  const known = TOOL_DISPLAYS[name];
  if (known) return known;
  return { label: name, summary: `Ran ${name}` };
}

// Whether the collapsed row should fall back to the generic "Tool" wording (unknown wire name).
export function isKnownToolName(name: string): boolean {
  return TOOL_DISPLAYS[name] !== undefined;
}

export const TOOL_DISPLAY_FALLBACK_LABEL = FALLBACK_LABEL;

// Extracts the human-facing search term used by the tool: query for web, url for fetch/open, content for a save,
// text for copy/share, name for file ops. Mirrors the live indicator's cascade in streamPipeline.
export function toolCallTerm(callArgumentsJson: string): string {
  let args: unknown;
  try {
    args = JSON.parse(callArgumentsJson);
  } catch {
    return "";
  }
  if (args === null || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  const term =
    record.query ?? record.url ?? record.content ?? record.text ?? record.name;
  return typeof term === "string" ? term : "";
}
