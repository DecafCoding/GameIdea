/**
 * BoardRow: one row of the board list (design 9.8): the type strip, the name as the link to
 * the board, the caption, and Rename and Delete. Rename turns the name into a text field
 * with Save and Cancel; Enter saves and Esc cancels. A just-imported row is highlighted and
 * its caption says "imported".
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Icon } from '@/shared/ui';
import { rowCaption, type BoardSummary } from './summary';
import styles from './BoardRow.module.css';

interface BoardRowProps {
  summary: BoardSummary;
  href: string;
  now: Date;
  /** Saves a new, trimmed, non-empty and changed name. */
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (summary: BoardSummary) => void;
  /** The row of a board that was just imported (design 9.8). */
  highlighted?: boolean;
}

export function BoardRow({
  summary,
  href,
  now,
  onRename,
  onDelete,
  highlighted = false,
}: BoardRowProps) {
  const [draft, setDraft] = useState<string | null>(null);

  async function finishRename(save: boolean) {
    const next = (draft ?? '').trim();
    setDraft(null);
    if (save && next !== '' && next !== summary.name) await onRename(summary.id, next);
  }

  return (
    <li
      className={highlighted ? `${styles.row} ${styles.highlighted}` : styles.row}
      data-highlighted={highlighted || undefined}
    >
      <span className={styles.strip} aria-hidden="true">
        {summary.typeStrip.length === 0 ? (
          <span className={`${styles.chip} ${styles.emptyChip}`} />
        ) : (
          summary.typeStrip.map((type, i) => (
            <span key={i} className={styles.chip} style={{ background: `var(--type-${type})` }} />
          ))
        )}
      </span>
      {draft === null ? (
        <>
          <span className={styles.text}>
            <a className={styles.name} href={href}>
              {summary.name}
            </a>
            <span className={styles.caption}>
              {rowCaption(summary, now, highlighted ? 'imported' : 'edited')}
            </span>
          </span>
          <span className={styles.buttons}>
            <button
              type="button"
              className={styles.icon}
              aria-label={`Rename ${summary.name}`}
              onClick={() => setDraft(summary.name)}
            >
              <Icon name="pencil" size={16} />
            </button>
            <button
              type="button"
              className={styles.icon}
              aria-label={`Delete ${summary.name}`}
              onClick={() => onDelete(summary)}
            >
              <Icon name="trash" size={16} />
            </button>
          </span>
        </>
      ) : (
        <RenameField draft={draft} onChange={setDraft} onDone={finishRename} />
      )}
    </li>
  );
}

interface RenameFieldProps {
  draft: string;
  onChange: (draft: string) => void;
  onDone: (save: boolean) => Promise<void>;
}

/** The rename text field, focused and selected, with Save, Cancel and the key hint. */
function RenameField({ draft, onChange, onDone }: RenameFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void onDone(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      void onDone(false);
    }
  }

  return (
    <>
      <span className={styles.text}>
        <input
          ref={input}
          className={styles.field}
          aria-label="Board Name"
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <span className={styles.hint}>Enter saves · Esc cancels</span>
      </span>
      <span className={styles.buttons}>
        <Button variant="primary" onClick={() => void onDone(true)}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => void onDone(false)}>
          Cancel
        </Button>
      </span>
    </>
  );
}
