// Settings pane inside AccountSheet — appearance + chat preferences. About/legal lives in AboutView.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Globe from "lucide-react-native/icons/globe";
import Palette from "lucide-react-native/icons/palette";
import Sparkles from "lucide-react-native/icons/sparkles";
import Trash2 from "lucide-react-native/icons/trash-2";
import Vibrate from "lucide-react-native/icons/vibrate";
import { ClearChatsChooser } from "@/components/settings/ClearChatsChooser";
import { InstructionEditorDialog } from "@/components/settings/InstructionEditorDialog";
import { ListRow } from "@/components/ui/ListRow";
import { Section } from "@/components/ui/Section";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { AgentSettingsSection } from "@/components/settings/AgentSettingsSection";
import { Switch } from "@/components/ui/Switch";
import {
  useTheme,
  useThemeColors,
  type ThemeMode,
} from "@/lib/theme/ThemeContext";
import { iconSize, size, strokeWidth } from "@/lib/design/tokens";
import { formatBytes } from "@/modules/chat/lib/formatBytes";
import { formatModelName } from "@/modules/models/lib/formatModelName";
import { useSelectedModel } from "@/modules/models/hooks/useSelectedModel";
import { useClearChats } from "@/modules/settings/hooks/useClearChats";
import {
  DEFAULT_DEEP_DIVE_INSTRUCTION,
  DEFAULT_WEB_SEARCH_INSTRUCTION,
} from "@/modules/chat/lib/selectionPrompts";
import {
  SETTINGS_SCROLL_PAD_BOTTOM,
  SETTINGS_SCROLL_PAD_TOP,
} from "@/modules/settings/constants";
import { useSettingsStore } from "@/lib/stores/settings.store";

// The excerpt-menu actions whose wording is editable (type shared with the editor dialog).
type ExcerptAction = "deepDive" | "webSearch" | "agent";

const THEME_OPTIONS: readonly SegmentedOption[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export interface SettingsViewProps {
  onChangeModel?: () => void;
  // Publishes the centered overlay (the clear-chats chooser) up to AccountSheet so it renders in the Sheet's
  // `overlays` slot — full-display centering, not inside the settings card. Null clears it.
  onRenderOverlays?: (overlays: React.ReactNode) => void;
  // Opens the agent-memory drill pane (long-term store listing + per-entry delete).
  onOpenAgentMemory?: () => void;
}

export function SettingsView({
  onChangeModel,
  onRenderOverlays,
  onOpenAgentMemory,
}: SettingsViewProps): React.ReactElement {
  const colors = useThemeColors();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const haptics = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const {
    isChooserOpen,
    openChooser,
    closeChooser,
    clearMine,
    clearDevice,
    totalChatBytes,
    deviceBytes,
  } = useClearChats();
  const selected = useSelectedModel();
  const deepDiveInstruction = useSettingsStore((st) => st.deepDiveInstruction);
  const webSearchInstruction = useSettingsStore(
    (st) => st.webSearchInstruction,
  );
  const setDeepDiveInstruction = useSettingsStore(
    (st) => st.setDeepDiveInstruction,
  );
  const setWebSearchInstruction = useSettingsStore(
    (st) => st.setWebSearchInstruction,
  );
  const setAgentInstructions = useSettingsStore(
    (st) => st.setAgentInstructions,
  );
  const handleOpenAgentMemory = useCallback((): void => {
    onOpenAgentMemory?.();
  }, [onOpenAgentMemory]);
  // Which excerpt action is being reworded, and the live draft. Null = the editor is closed.
  const [editingAction, setEditingAction] = useState<ExcerptAction | null>(
    null,
  );
  const [draft, setDraft] = useState<string>("");
  const openEditor = useCallback((action: ExcerptAction): void => {
    setDraft(
      action === "deepDive"
        ? (useSettingsStore.getState().deepDiveInstruction ??
            DEFAULT_DEEP_DIVE_INSTRUCTION)
        : action === "webSearch"
          ? (useSettingsStore.getState().webSearchInstruction ??
            DEFAULT_WEB_SEARCH_INSTRUCTION)
          : (useSettingsStore.getState().agentInstructions ?? ""),
    );
    setEditingAction(action);
  }, []);
  const closeEditor = useCallback((): void => {
    setEditingAction(null);
  }, []);
  const handleEditDeepDive = useCallback((): void => {
    openEditor("deepDive");
  }, [openEditor]);
  const handleEditWebSearch = useCallback((): void => {
    openEditor("webSearch");
  }, [openEditor]);
  // A blanked draft is stored as null, which restores the shipped wording rather than sending an empty instruction.
  const saveEditor = useCallback((): void => {
    if (editingAction === "deepDive") setDeepDiveInstruction(draft);
    if (editingAction === "webSearch") setWebSearchInstruction(draft);
    if (editingAction === "agent") setAgentInstructions(draft);
    setEditingAction(null);
  }, [
    draft,
    editingAction,
    setDeepDiveInstruction,
    setWebSearchInstruction,
    setAgentInstructions,
  ]);
  const handleEditAgent = useCallback((): void => {
    openEditor("agent");
  }, [openEditor]);
  const handleThemeChange = useCallback(
    (next: string): void => {
      setThemeMode(next as ThemeMode);
    },
    [setThemeMode],
  );
  const handleHapticsChange = useCallback(
    (next: boolean): void => {
      setHapticsEnabled(next);
    },
    [setHapticsEnabled],
  );
  const overlays = useMemo(
    () => (
      <>
        <ClearChatsChooser
          visible={isChooserOpen}
          mineBytes={totalChatBytes}
          deviceBytes={deviceBytes}
          onChooseMine={clearMine}
          onChooseDevice={clearDevice}
          onCancel={closeChooser}
        />
        {/* Same dialog the rename flow uses: a multiline field over the actions. */}
        <InstructionEditorDialog
          action={editingAction}
          draft={draft}
          onChangeDraft={setDraft}
          onConfirm={saveEditor}
          onCancel={closeEditor}
        />
      </>
    ),
    [
      isChooserOpen,
      totalChatBytes,
      deviceBytes,
      clearMine,
      clearDevice,
      closeChooser,
      draft,
      editingAction,
      saveEditor,
      closeEditor,
    ],
  );
  useEffect(() => {
    onRenderOverlays?.(overlays);
  }, [onRenderOverlays, overlays]);
  useEffect(
    () => (): void => {
      onRenderOverlays?.(null);
    },
    [onRenderOverlays],
  );
  // ChatHome's onChangeModel already closes the sheet and schedules the picker; calling onClose() here would double-fire the dismiss.
  const handleChangeModel = useCallback((): void => {
    onChangeModel?.();
  }, [onChangeModel]);
  const modelLabel = selected.model
    ? formatModelName(selected.model.name)
    : "Not set";
  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: SETTINGS_SCROLL_PAD_TOP,
          paddingBottom: SETTINGS_SCROLL_PAD_BOTTOM,
        }}
        showsVerticalScrollIndicator={false}
        bounces
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
      >
        <Section label="Appearance">
          <ListRow
            icon={Palette}
            label="Theme"
            trailing={
              <View className="pr-2" style={{ width: size.segmentedSlot }}>
                <SegmentedControl
                  options={[...THEME_OPTIONS]}
                  value={themeMode}
                  onChange={handleThemeChange}
                  size="compact"
                />
              </View>
            }
          />
          <ListRow
            icon={Vibrate}
            label="Haptics"
            trailing={
              <Switch value={haptics} onValueChange={handleHapticsChange} />
            }
            showDivider={false}
          />
        </Section>
        <Section label="Excerpt actions">
          <ListRow
            icon={Sparkles}
            label="Deep dive"
            subtitle={deepDiveInstruction === null ? "Default" : "Custom"}
            onPress={handleEditDeepDive}
            trailing={
              <ChevronRight
                size={iconSize.md}
                color={colors.labelTertiary}
                strokeWidth={strokeWidth.bold}
              />
            }
          />
          <ListRow
            icon={Globe}
            label="Web search"
            subtitle={webSearchInstruction === null ? "Default" : "Custom"}
            onPress={handleEditWebSearch}
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
        <AgentSettingsSection
          onOpenAgentMemory={handleOpenAgentMemory}
          onEditInstructions={handleEditAgent}
        />
        <Section label="Chat">
          <ListRow
            icon={Sparkles}
            label="Default model"
            subtitle={modelLabel}
            onPress={handleChangeModel}
            trailing={
              // §15 drill-in chevrons carry the tertiary label tint (external-link rows stay secondary).
              <ChevronRight size={iconSize.md} color={colors.labelTertiary} />
            }
          />
          <ListRow
            icon={Trash2}
            label="Clear all chats"
            destructive
            trailingMeta={
              totalChatBytes > 0 ? formatBytes(totalChatBytes) : "Empty"
            }
            onPress={openChooser}
            showDivider={false}
          />
        </Section>
      </ScrollView>
    </>
  );
}
