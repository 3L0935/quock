// Instruction editor for the excerpt-action + agent wording rows. Extracted from SettingsView so the pane stays
// under the 300-line guideline; state (which action, the live draft) stays with the pane, this is the dialog only.

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EXCERPT_INSTRUCTION_MAX_CHARS } from "@/modules/settings/constants";

// The three rows whose wording is editable.
export type EditableAction = "deepDive" | "webSearch" | "agent";

export interface InstructionEditorDialogProps {
  // The action being reworded; null = the editor is closed (the dialog stays mounted, visibility is a prop).
  action: EditableAction | null;
  draft: string;
  onChangeDraft: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InstructionEditorDialog({
  action,
  draft,
  onChangeDraft,
  onConfirm,
  onCancel,
}: InstructionEditorDialogProps): React.ReactElement {
  return (
    <ConfirmDialog
      visible={action !== null}
      title={
        action === "webSearch"
          ? "Web search"
          : action === "agent"
            ? "Agent instructions"
            : "Deep dive"
      }
      message={
        action === "webSearch"
          ? "Sent with the excerpt when you tap Web search."
          : action === "agent"
            ? "Standing instructions the agent follows in every conversation where agent mode is on."
            : "Sent with the excerpt when you tap Deep dive."
      }
      confirmLabel="Save"
      inputValue={draft}
      onChangeInput={onChangeDraft}
      // Short on purpose: an empty multiline field is pinned to one line, so a long placeholder would be clipped.
      inputPlaceholder="Default wording"
      inputMaxLength={EXCERPT_INSTRUCTION_MAX_CHARS}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
