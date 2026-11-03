/**
 * NewBoardDialog: the New Board dialog (design 9.3). It asks only for a name; every board
 * starts with all 21 genres on. Make Board stays disabled until the trimmed name has text.
 * Enter makes the board; Cancel and Esc make nothing. The parent mounts it only while
 * open, so the name starts empty on every open.
 */
import { useId, useState } from 'react';
import { Button, Dialog } from '@/shared/ui';
import styles from './NewBoardDialog.module.css';

interface NewBoardDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the trimmed board name. */
  onCreate: (name: string) => void;
}

export const NEW_BOARD_HELP_TEXT = 'All 21 genres start on. Change them in the Genres panel.';

export function NewBoardDialog({ open, onCancel, onCreate }: NewBoardDialogProps) {
  const [draft, setDraft] = useState('');
  const nameId = useId();
  const formId = useId();
  const name = draft.trim();

  return (
    <Dialog
      open={open}
      title="New Board"
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={name.length === 0}>
            Make Board
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.length > 0) onCreate(name);
        }}
      >
        <label htmlFor={nameId} className={styles.label}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          className={styles.name}
          value={draft}
          autoComplete="off"
          data-autofocus
          onChange={(event) => setDraft(event.target.value)}
        />
        <p className={styles.help}>{NEW_BOARD_HELP_TEXT}</p>
      </form>
    </Dialog>
  );
}
