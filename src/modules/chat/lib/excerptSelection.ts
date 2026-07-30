// The menu hands back `${messageId}:${unitKey}`; the text is resolved from the loaded reply here, so it is never
// mirrored into the UI store and always matches what the message says now.

import { excerptTextForKey } from "@/components/ui/markdown/excerptText";
import type { DbMessage } from "@/lib/db/types";

export function resolveExcerpt(
  messages: readonly Pick<DbMessage, "id" | "content">[],
  compositeKey: string,
): string {
  const separator = compositeKey.indexOf(":");
  if (separator < 0) return "";
  const messageId = compositeKey.slice(0, separator);
  const unitKey = compositeKey.slice(separator + 1);
  const message = messages.find((m) => String(m.id) === messageId);
  return message === undefined
    ? ""
    : excerptTextForKey(message.content, unitKey);
}
