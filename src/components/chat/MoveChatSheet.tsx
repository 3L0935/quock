// Move-to-folder sheet: pick an existing folder, unfile back to the timeline, or create a new folder by name.
// Opened from a chat row's swipe "Move" action; commits through the folder mutations and closes on success.

import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import FolderInput from "lucide-react-native/icons/folder-input";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { TextField } from "@/components/ui/TextField";
import {
  useChatFolders,
  useCreateChatFolder,
  useMoveChatToFolder,
} from "@/modules/chat/hooks/useChatFolders";
import { useThemeColors } from "@/lib/theme/ThemeContext";
import { iconSize, strokeWidth } from "@/lib/design/tokens";
import type { ChatId, FolderId } from "@/lib/types/ids";

export interface MoveChatSheetProps {
  visible: boolean;
  onClose: () => void;
  // The chat being filed; null while closed.
  chatId: ChatId | null;
}

const FOLDER_NAME_MAX_CHARS = 40;

function FolderRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 gap-2.5"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="w-9 h-9 items-center justify-center">{icon}</View>
      <Text
        className="flex-1 font-sans text-body text-foreground"
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MoveChatSheet({
  visible,
  onClose,
  chatId,
}: MoveChatSheetProps): React.ReactElement {
  const colors = useThemeColors();
  const foldersQuery = useChatFolders();
  const move = useMoveChatToFolder();
  const create = useCreateChatFolder();
  const [newFolderName, setNewFolderName] = useState<string>("");
  const trimmedName = useMemo(
    () => newFolderName.trim().slice(0, FOLDER_NAME_MAX_CHARS),
    [newFolderName],
  );
  const handlePick = (folderId: FolderId | null): void => {
    if (chatId === null) return;
    move.mutate(
      { chatId, folderId },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };
  // Creating a folder files the chat into it in one gesture: insert the row, then file the chat into it.
  const handleCreate = (): void => {
    if (chatId === null || trimmedName.length === 0) return;
    const name = trimmedName;
    setNewFolderName("");
    create.mutate(name, {
      onSuccess: (folder) => {
        move.mutate(
          { chatId, folderId: folder.id },
          {
            onSuccess: () => {
              onClose();
            },
          },
        );
      },
    });
  };
  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={["45%"]}>
      <SheetHeader title="Move to folder" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        <FolderRow
          icon={
            <FolderInput
              size={iconSize.md}
              color={colors.mutedForeground}
              strokeWidth={strokeWidth.bold}
            />
          }
          label="No folder"
          onPress={(): void => handlePick(null)}
        />
        {foldersQuery.data?.map((folder) => (
          <FolderRow
            key={folder.id}
            icon={
              <FolderInput
                size={iconSize.md}
                color={colors.foreground}
                strokeWidth={strokeWidth.bold}
              />
            }
            label={folder.name}
            onPress={(): void => handlePick(folder.id)}
          />
        ))}
      </ScrollView>
      <View className="px-4 pb-4 pt-1">
        <TextField
          value={newFolderName}
          onChangeText={setNewFolderName}
          placeholder="New folder name"
          maxLength={FOLDER_NAME_MAX_CHARS}
          editable
          containerClassName="bg-card border border-border rounded-full px-3.5"
        />
        <View className="mt-2">
          <Button
            variant="primary"
            size="md"
            disabled={trimmedName.length === 0 || chatId === null}
            onPress={handleCreate}
          >
            Create and move
          </Button>
        </View>
      </View>
    </Sheet>
  );
}
