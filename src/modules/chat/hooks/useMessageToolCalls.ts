// Tool-call step list for one assistant turn, read from the persisted tool_calls rows.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useDb } from "@/lib/contexts/DbContext";
import type { DbToolCall } from "@/lib/db/types";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { MessageId } from "@/lib/types/ids";

export function useMessageToolCalls(
  messageId: MessageId,
): UseQueryResult<DbToolCall[], Error> {
  const { toolCalls } = useDb();
  return useQuery<DbToolCall[], Error>({
    queryKey: queryKeys.messageToolCalls(messageId),
    queryFn: (): Promise<DbToolCall[]> => toolCalls.listByMessage(messageId),
    staleTime: Infinity,
  });
}
