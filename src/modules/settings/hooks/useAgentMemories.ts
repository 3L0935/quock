// Agent memory management for the Settings sheet: the account's long-term memories (the SQLite store injected as
// system context in agent mode), with per-entry delete. Distinct from the custom instructions pref (MMKV), which the
// "Instructions" row already edits — this covers only what the model saved via memory_save.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useDb } from "@/lib/contexts/DbContext";
import type { DbMemory } from "@/lib/db/types";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { MemoryId } from "@/lib/types/ids";

export function useAgentMemories(): UseQueryResult<DbMemory[], Error> {
  const { memories } = useDb();
  return useQuery<DbMemory[], Error>({
    queryKey: queryKeys.agentMemories(),
    queryFn: (): Promise<DbMemory[]> => memories.list(),
    staleTime: 0,
  });
}

export interface UseForgetAgentMemoryResult {
  forget: (id: MemoryId) => Promise<void>;
  isPending: boolean;
}

export function useForgetAgentMemory(): UseForgetAgentMemoryResult {
  const queryClient = useQueryClient();
  const { memories } = useDb();
  const mutation = useMutation({
    mutationFn: async (id: MemoryId): Promise<void> => {
      await memories.forget(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agentMemories(),
      });
    },
  });
  return { forget: mutation.mutateAsync, isPending: mutation.isPending };
}
