// Tool-step rows for one interleave point and the imports AssistantMessage needs to interleave them. All icon maps
// live here (not in toolCallDisplay) because lib files run under Jest, which cannot transform lucide's ESM modules.

import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Clock from "lucide-react-native/icons/clock";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clipboard from "lucide-react-native/icons/clipboard";
import Database from "lucide-react-native/icons/database";
import FileText from "lucide-react-native/icons/file-text";
import Globe from "lucide-react-native/icons/globe";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Share2 from "lucide-react-native/icons/share-2";
import Smartphone from "lucide-react-native/icons/smartphone";
import Wrench from "lucide-react-native/icons/wrench";
import type { LucideIcon } from "lucide-react-native";
import { toolCallTerm } from "@/modules/chat/lib/toolCallDisplay";
import type { DbToolCall } from "@/lib/db/types";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { iconSize, strokeWidth } from "@/lib/design/tokens";

// Result bodies can be huge (a fetched page); the expanded panel clamps rather than printing a novel.
const TOOL_RESULT_DISPLAY_MAX_CHARS = 400;
// One-line term preview on the collapsed row.
const TOOL_TERM_PREVIEW_CHARS = 48;

const TOOL_ICONS: Record<string, LucideIcon> = {
  web_search: Globe,
  web_fetch: Globe,
  memory_save: Database,
  memory_read: Database,
  memory_forget: Database,
  search_chats: MessageCircle,
  read_chat: MessageCircle,
  get_current_time: Clock,
  copy_to_clipboard: Clipboard,
  share_text: Share2,
  open_url: Globe,
  get_device_info: Smartphone,
  save_file: FileText,
  read_saved_file: FileText,
  list_saved_files: FileText,
};

// Labels for the collapsed row; unknown names fall back to the raw wire name.
const TOOL_LABELS: Record<string, string> = {
  web_search: "Web search",
  web_fetch: "Fetch page",
  memory_save: "Save memory",
  memory_read: "Read memory",
  memory_forget: "Forget memory",
  search_chats: "Search chats",
  read_chat: "Read chat",
  get_current_time: "Check time",
  copy_to_clipboard: "Copy",
  share_text: "Share",
  open_url: "Open link",
  get_device_info: "Device info",
  save_file: "Save file",
  read_saved_file: "Read file",
  list_saved_files: "List files",
};

function toolIcon(name: string): LucideIcon {
  return TOOL_ICONS[name] ?? Wrench;
}

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

function formatTerm(raw: string): string {
  const singleLine = raw.replace(/\s+/g, " ").trim();
  return singleLine.length > TOOL_TERM_PREVIEW_CHARS
    ? `${singleLine.slice(0, TOOL_TERM_PREVIEW_CHARS)}…`
    : singleLine;
}

function ToolStep({ call }: { call: DbToolCall }): React.ReactElement {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const Icon = toolIcon(call.name);
  const term = toolCallTerm(call.arguments);
  const isFailed = call.status === "failed";
  const expandedArgs = React.useMemo((): string => {
    try {
      return JSON.stringify(JSON.parse(call.arguments), null, 2);
    } catch {
      return call.arguments;
    }
  }, [call.arguments]);
  const expandedResult = React.useMemo((): string => {
    if (call.result === null) return "";
    return call.result.length > TOOL_RESULT_DISPLAY_MAX_CHARS
      ? `${call.result.slice(0, TOOL_RESULT_DISPLAY_MAX_CHARS)}…`
      : call.result;
  }, [call.result]);
  return (
    <View>
      <Pressable
        onPress={(): void => setIsExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={
          isExpanded
            ? `Hide ${toolLabel(call.name)} details`
            : `Show ${toolLabel(call.name)} details`
        }
        className="flex-row items-center gap-1.5 py-0.5"
      >
        <Icon
          size={iconSize.xs}
          color={isFailed ? colors.destructive : colors.mutedForeground}
          strokeWidth={strokeWidth.bold}
        />
        <Text
          className={
            isFailed
              ? "font-sans text-footnote text-destructive"
              : "font-sans text-footnote text-muted-foreground"
          }
        >
          {isFailed ? `${toolLabel(call.name)} unavailable` : "Done"}
        </Text>
        {term.length > 0 && !isFailed ? (
          <Text
            className="flex-1 font-sans text-footnote text-label-tertiary"
            numberOfLines={1}
          >
            {formatTerm(term)}
          </Text>
        ) : null}
        {isExpanded ? (
          <ChevronDown
            size={iconSize.xs}
            color={colors.mutedForeground}
            strokeWidth={strokeWidth.bold}
          />
        ) : (
          <ChevronRight
            size={iconSize.xs}
            color={colors.mutedForeground}
            strokeWidth={strokeWidth.bold}
          />
        )}
      </Pressable>
      {isExpanded ? (
        <View className="mb-1">
          <Text className="font-sans text-caption-1 text-muted-foreground">
            Arguments
          </Text>
          <Text
            className="font-mono text-caption-2 text-muted-foreground"
            selectable
          >
            {expandedArgs}
          </Text>
          {expandedResult.length > 0 ? (
            <>
              <Text className="font-sans text-caption-1 text-muted-foreground mt-1">
                Result
              </Text>
              <Text
                className="font-mono text-caption-2 text-muted-foreground"
                selectable
              >
                {expandedResult}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// Collapsed steps for one interleave point; the border-left visual marks the pipeline break.
export function StepsGroup({
  calls,
}: {
  calls: DbToolCall[];
}): React.ReactElement {
  return (
    <View className="my-1 border-l-2 border-border pl-2.5">
      {calls.map((call) => (
        <ToolStep
          key={`${call.round}:${call.createdAt}:${call.name}`}
          call={call}
        />
      ))}
    </View>
  );
}
