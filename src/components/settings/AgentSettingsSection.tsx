// Agent block of the Settings pane: master switch, instructions drill-in, memory drill-in. Split out of
// SettingsView (per PR review, past the 300-line guideline); the round cap is a constant, not a user control.

import React from "react";
import Bot from "lucide-react-native/icons/bot";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Database from "lucide-react-native/icons/database";
import PenLine from "lucide-react-native/icons/pen-line";
import { ListRow } from "@/components/ui/ListRow";
import { Section } from "@/components/ui/Section";
import { Switch } from "@/components/ui/Switch";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { iconSize, strokeWidth } from "@/lib/design/tokens";
import { useSettingsStore } from "@/lib/stores/settings.store";
import { useAgentMemories } from "@/modules/settings/hooks/useAgentMemories";

export interface AgentSettingsSectionProps {
  // Opens the instructions editor (the ConfirmDialog is owned by the parent SettingsView).
  onEditInstructions: () => void;
  // Opens the memory drill pane (long-term store listing + per-entry delete).
  onOpenAgentMemory: () => void;
}

export function AgentSettingsSection({
  onEditInstructions,
  onOpenAgentMemory,
}: AgentSettingsSectionProps): React.ReactElement {
  const colors = useThemeColors();
  const agentEnabled = useSettingsStore((s) => s.agentEnabled);
  const setAgentEnabled = useSettingsStore((s) => s.setAgentEnabled);
  const agentInstructions = useSettingsStore((s) => s.agentInstructions);
  // Count-only read for the drill-in row's trailingMeta; the pane itself owns the full list.
  const agentMemories = useAgentMemories();
  const memoryCount = agentMemories.data?.length;
  return (
    <Section label="Agent">
      <ListRow
        icon={Bot}
        label="Agent mode"
        subtitle="Tools and memory in every conversation"
        trailing={
          <Switch
            value={agentEnabled}
            onValueChange={(next: boolean): void => setAgentEnabled(next)}
          />
        }
      />
      <ListRow
        icon={PenLine}
        label="Instructions"
        subtitle={agentInstructions === null ? "Default" : "Custom"}
        onPress={onEditInstructions}
        trailing={
          <ChevronRight
            size={iconSize.md}
            color={colors.labelTertiary}
            strokeWidth={strokeWidth.bold}
          />
        }
      />
      <ListRow
        icon={Database}
        label="Memories"
        subtitle="What the agent remembers about you across chats"
        trailingMeta={
          memoryCount === undefined
            ? undefined
            : memoryCount === 0
              ? "Empty"
              : String(memoryCount)
        }
        onPress={onOpenAgentMemory}
        trailing={
          <ChevronRight
            size={iconSize.md}
            color={colors.labelTertiary}
            strokeWidth={strokeWidth.bold}
          />
        }
        showDivider={false}
      />
    </Section>
  );
}
