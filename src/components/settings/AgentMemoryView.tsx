// Agent memory drill pane from Settings > Agent: every long-term memory the model saved, its full content, and a
// per-entry delete (the destructive counterpart of memory_forget, for human hands). The custom instructions pref is
// NOT shown here — it is a system-prompt setting edited from its own row, not part of the injected memory store.

import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Trash2 from "lucide-react-native/icons/trash-2";
import {
  SETTINGS_DRILL_SCROLL_PAD_TOP,
  SETTINGS_SCROLL_PAD_BOTTOM,
} from "@/modules/settings/constants";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListRow } from "@/components/ui/ListRow";
import {
  useAgentMemories,
  useForgetAgentMemory,
} from "@/modules/settings/hooks/useAgentMemories";
import { useDb } from "@/lib/contexts/DbContext";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { componentLayout, iconSize, strokeWidth } from "@/lib/design/tokens";
import type { MemoryId } from "@/lib/types/ids";

export interface AgentMemoryViewProps {
  // Publishes the delete confirmation up to AccountSheet so it renders in the Sheet's `overlays` slot — centered
  // against the full display, not inside the pane card. Null clears it.
  onRenderOverlays?: (overlays: React.ReactNode) => void;
}

function formatMemoryDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(ts),
  );
}

export function AgentMemoryView({
  onRenderOverlays,
}: AgentMemoryViewProps): React.ReactElement {
  const colors = useThemeColors();
  const { data: memories, isLoading } = useAgentMemories();
  const { forget, isPending } = useForgetAgentMemory();
  const { memories: repo } = useDb();
  // Which entry is awaiting delete confirmation. Null = the dialog is closed.
  const [pendingDelete, setPendingDelete] = useState<MemoryId | null>(null);
  const pendingMemory = useMemo(
    () =>
      pendingDelete === null
        ? null
        : (memories?.find((m) => m.id === pendingDelete) ?? null),
    [memories, pendingDelete],
  );
  const handleConfirmDelete = useCallback((): void => {
    if (pendingDelete === null) return;
    forget(pendingDelete)
      .then(() => {
        setPendingDelete(null);
      })
      .catch((err: unknown) => {
        console.warn("AgentMemoryView: delete failed", err);
        setPendingDelete(null);
      });
  }, [forget, pendingDelete]);
  const closeDelete = useCallback((): void => {
    setPendingDelete(null);
  }, []);
  // Clear-all mirrors the Settings row but lands inside the pane where the list lives. The ConfirmDialog centers
  // against the display via the overlays slot like the per-entry one.
  const [isClearAllOpen, setIsClearAllOpen] = useState<boolean>(false);
  const handleClearAll = useCallback((): void => {
    setIsClearAllOpen(false);
    repo.clearAll().catch((err: unknown) => {
      console.warn("AgentMemoryView: clear all failed", err);
    });
  }, [repo]);
  const overlays = useMemo(
    () => (
      <>
        <ConfirmDialog
          visible={pendingDelete !== null}
          title="Forget this memory?"
          message={pendingMemory?.content}
          destructive
          confirmLabel="Forget"
          confirmDisabled={isPending}
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
          testID="agent-memory-delete-confirm"
        />
        <ConfirmDialog
          visible={isClearAllOpen}
          title="Forget all memories?"
          message="Every long-term memory the agent saved will be erased. This can't be undone."
          destructive
          confirmLabel="Forget all"
          onConfirm={handleClearAll}
          onCancel={(): void => setIsClearAllOpen(false)}
          testID="agent-memory-clear-confirm"
        />
      </>
    ),
    [
      pendingDelete,
      pendingMemory,
      isPending,
      handleConfirmDelete,
      closeDelete,
      isClearAllOpen,
      handleClearAll,
    ],
  );
  React.useEffect(() => {
    onRenderOverlays?.(overlays);
  }, [onRenderOverlays, overlays]);
  React.useEffect(
    () => (): void => {
      onRenderOverlays?.(null);
    },
    [onRenderOverlays],
  );
  const total = memories?.length ?? 0;
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans text-footnote text-muted-foreground">
          Loading…
        </Text>
      </View>
    );
  }
  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: SETTINGS_DRILL_SCROLL_PAD_TOP,
          paddingBottom: SETTINGS_SCROLL_PAD_BOTTOM,
        }}
        showsVerticalScrollIndicator={false}
        bounces
        decelerationRate="normal"
      >
        <View style={{ paddingHorizontal: componentLayout.listSection.insetX }}>
          <Text className="font-sans text-subhead text-muted-foreground mb-4">
            Facts the agent saved about you. They are injected as system context
            on every agent-mode send, hottest first. Tap one to forget it.
          </Text>
        </View>
        {total === 0 ? (
          <View
            style={{ paddingHorizontal: componentLayout.listSection.insetX }}
          >
            <Text className="font-sans text-body text-label-secondary">
              Nothing saved yet. When agent mode is on, the agent stores durable
              facts here with its memory tool.
            </Text>
          </View>
        ) : (
          <View>
            {memories?.map((memory) => (
              <ListRow
                key={memory.id}
                label={memory.content}
                subtitle={formatMemoryDate(memory.createdAt)}
                subtitleNumberOfLines={4}
                subtitleTiny
                onPress={(): void => setPendingDelete(memory.id)}
                trailing={
                  <Trash2
                    size={iconSize.sm}
                    color={colors.destructive}
                    strokeWidth={strokeWidth.bold}
                  />
                }
              />
            ))}
            <ListRow
              icon={Trash2}
              label="Forget all"
              destructive
              onPress={(): void => setIsClearAllOpen(true)}
              showDivider={false}
            />
          </View>
        )}
      </ScrollView>
    </>
  );
}
