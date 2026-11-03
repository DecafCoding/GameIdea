/**
 * TopBar: the board screen's 56 px top bar (design 8.1): the app mark and wordmark
 * as one link to the board list, the board name field, the save mark, and Undo and Redo,
 * enabled while the undo history has a step, then the Export menu.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { ExportButton } from '@/features/export';
import { useBoardStore, useUndoAvailability } from '@/shared/store';
import { Icon } from '@/shared/ui';
import { SaveMark } from './SaveMark';
import styles from './TopBar.module.css';

export function AppMark() {
  return (
    <span className={styles.mark}>
      <Icon name="hook" size={16} />
    </span>
  );
}

export function TopBar() {
  const { canUndo, canRedo } = useUndoAvailability();
  const name = useBoardStore((state) => state.board.name);
  return (
    <header className={styles.bar}>
      <a href="#/" className={styles.home} aria-label="Board List">
        <AppMark />
        <span className={styles.wordmark}>GameIdea</span>
      </a>
      <span className={styles.divider} aria-hidden="true" />
      <BoardNameField />
      <SaveMark />
      <span className={styles.gap} />
      <button
        type="button"
        className={styles.history}
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => useBoardStore.getState().undo()}
      >
        <Icon name="undo" size={18} />
      </button>
      <button
        type="button"
        className={styles.history}
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => useBoardStore.getState().redo()}
      >
        <Icon name="redo" size={18} />
      </button>
      <ExportButton name={name} getBoard={() => useBoardStore.getState().board} />
    </header>
  );
}

/** Commits a new name on Enter or blur; Esc or an empty name puts the old name back. */
function BoardNameField() {
  const name = useBoardStore((state) => state.board.name);
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const [draft, setDraft] = useState<string | null>(null);
  // Esc blurs the field; the blur that follows must not commit the draft.
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next === '' || next === name) return;
    changeBoard((board) => ({ ...board, name: next }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      commit();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      cancelled.current = true;
      setDraft(null);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      className={styles.name}
      aria-label="Board Name"
      value={draft ?? name}
      onChange={(event) => {
        cancelled.current = false;
        setDraft(event.target.value);
      }}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  );
}
