// Chat folder triage: the drawer's manual organisation layer. Folders are plain named buckets; a chat filed in one
// leaves the date buckets and renders under its folder heading. Unfiling (or deleting the folder) returns members
// to the timeline.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useDb } from "@/lib/contexts/DbContext";
import type { DbChatFolder } from "@/lib/db/types";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { ChatId, FolderId } from "@/lib/types/ids";

export function useChatFolders(): UseQueryResult<DbChatFolder[], Error> {
  const { chats } = useDb();
  return useQuery<DbChatFolder[], Error>({
    queryKey: queryKeys.chatFolders(),
    queryFn: (): Promise<DbChatFolder[]> => chats.listFolders(),
    staleTime: 0,
  });
}

export function useCreateChatFolder(): UseMutationResult<
  DbChatFolder,
  Error,
  string
> {
  const queryClient = useQueryClient();
  const { chats } = useDb();
  return useMutation<DbChatFolder, Error, string>({
    mutationFn: async (name: string): Promise<DbChatFolder> =>
      chats.createFolder(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatFolders() });
    },
  });
}

export interface MoveChatToFolderInput {
  chatId: ChatId;
  folderId: FolderId | null;
}

// Filing a chat invalidates both the list query (rows re-group) and the folder list (member counts change).
export function useMoveChatToFolder(): UseMutationResult<
  void,
  Error,
  MoveChatToFolderInput
> {
  const queryClient = useQueryClient();
  const { chats } = useDb();
  return useMutation<void, Error, MoveChatToFolderInput>({
    mutationFn: async ({ chatId, folderId }): Promise<void> => {
      await chats.setFolder(chatId, folderId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatFolders() });
    },
  });
}
