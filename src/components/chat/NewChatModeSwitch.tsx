// Composer-mode switch for a brand-new conversation: Chat or Agent, chosen before the first send. Once any message
// exists the conversation is committed and the switch disappears (a mid-thread mode change would fork the memory
// contract mid-conversation). Writes the same persisted per-chat flag the old + -hub row used.

import React from "react";
import { Text, View } from "react-native";
import Bot from "lucide-react-native/icons/bot";
import MessageCircle from "lucide-react-native/icons/message-circle";
import clsx from "clsx";
import { Pressable } from "@/components/ui/Pressable";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { iconSize, strokeWidth } from "@/lib/design/tokens";

export interface NewChatModeSwitchProps {
  agentEnabled: boolean;
  onChange: (agentEnabled: boolean) => void;
  // Hides the switch (first message sent or history loaded): the mode is locked for the thread.
  visible: boolean;
  testID?: string;
}

function ModeSegment({
  label,
  icon: Icon,
  selected,
  onPress,
  testID,
}: {
  label: string;
  icon: React.ElementType;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className="flex-row items-center justify-center gap-1.5 rounded-full px-4 py-2"
      testID={testID}
    >
      <Icon
        size={iconSize.sm}
        color={selected ? colors.primaryForeground : colors.mutedForeground}
        strokeWidth={strokeWidth.bold}
      />
      <Text
        className={clsx(
          "font-sans font-semibold text-footnote",
          selected ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NewChatModeSwitchImpl({
  agentEnabled,
  onChange,
  visible,
  testID,
}: NewChatModeSwitchProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <View
      className="self-center rounded-full bg-card border border-border p-0.5 flex-row"
      style={{ marginBottom: 6 }}
      testID={testID}
    >
      <ModeSegment
        label="Chat"
        icon={MessageCircle}
        selected={!agentEnabled}
        onPress={(): void => {
          if (agentEnabled) onChange(false);
        }}
      />
      <ModeSegment
        label="Agent"
        icon={Bot}
        selected={agentEnabled}
        onPress={(): void => {
          if (!agentEnabled) onChange(true);
        }}
      />
    </View>
  );
}

export const NewChatModeSwitch = React.memo(NewChatModeSwitchImpl);
