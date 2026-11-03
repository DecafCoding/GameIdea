/**
 * DeleteBoardDialog: the confirm before a board is deleted (design 9.8, frame 6). Only
 * Delete Board deletes; Cancel and Esc close with no change. Cancel takes focus first.
 */
import { Button, Dialog } from '@/shared/ui';

interface DeleteBoardDialogProps {
  /** The name of the board to delete, or null when the dialog is closed. */
  name: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DELETE_BODY_TEXT =
  'Undo does not bring a board back. Export it first if you want a copy.';

export function DeleteBoardDialog({ name, onCancel, onConfirm }: DeleteBoardDialogProps) {
  return (
    <Dialog
      open={name !== null}
      title={`Delete "${name ?? ''}"?`}
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" autoFocus onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete Board
          </Button>
        </>
      }
    >
      <p>{DELETE_BODY_TEXT}</p>
    </Dialog>
  );
}
