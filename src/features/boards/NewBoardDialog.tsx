/**
 * NewBoardDialog: the New Board dialog (design 9.3). It asks for a name and a board kind,
 * One-Pager or Free Form (default Free Form, docs/feature-one-pager-board.html); every board
 * starts with all 21 genres on. The kind uses the Settings segmented control and cannot
 * change later. Make Board stays disabled until the trimmed name has text. Enter makes the
 * board; Cancel and Esc make nothing. The parent mounts it only while open, so the name
 * starts empty and the kind starts at Free Form on every open.
 */
import { useId, useState } from 'react';
import { Segmented, type SegmentedOption } from '@/features/settings';
import type { BoardKind } from '@/shared/model';
import { Button, Dialog } from '@/shared/ui';
import styles from './NewBoardDialog.module.css';

interface NewBoardDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the trimmed board name and the chosen kind. */
  onCreate: (name: string, kind: BoardKind) => void;
}

/** The help line under the name field (design 9.3, 2026-11-04). */
export const NEW_BOARD_HELP_TEXT =
  'All 21 genres start on. Change them in Settings, on the Genres tab.';

/** The help line under the kind choice. */
export const NEW_BOARD_KIND_HELP_TEXT =
  'A One-Pager board holds 1 game: 1 Hook Card and a Details panel. The kind cannot change later.';

const KIND_OPTIONS: readonly SegmentedOption<BoardKind>[] = [
  { value: 'onePager', label: 'One-Pager' },
  { value: 'free', label: 'Free Form' },
];

export function NewBoardDialog({ open, onCancel, onCreate }: NewBoardDialogProps) {
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<BoardKind>('free');
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
          if (name.length > 0) onCreate(name, kind);
        }}
      >
        <div className={styles.block}>
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
        </div>
        <div className={styles.block}>
          <span className={styles.label}>Kind</span>
          <Segmented label="Board Kind" value={kind} options={KIND_OPTIONS} onChange={setKind} />
          <p className={styles.help}>{NEW_BOARD_KIND_HELP_TEXT}</p>
        </div>
      </form>
    </Dialog>
  );
}
