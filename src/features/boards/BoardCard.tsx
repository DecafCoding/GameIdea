/**
 * BoardCard: one board on the board list (design 9.3): the name as the link to the board
 * (its hit area covers the whole card, except the More button),
 * the meta line, the first hook preview, a row of deck dots and a More button with the
 * board menu (Rename, Export Board File, Delete). Rename turns the name into a field in
 * place: Enter saves, Esc cancels, a click outside the card also saves, and an empty name
 * keeps the old one. A just-imported card is highlighted and its meta line says "Imported".
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { Icon } from '@/shared/ui';
import { BoardMenu } from './BoardMenu';
import { metaLine, type BoardSummary } from './summary';
import styles from './BoardCard.module.css';

export const NO_HOOK_CARD_TEXT = 'No Hook Card on this board.';

interface BoardCardProps {
  summary: BoardSummary;
  href: string;
  now: Date;
  /** Saves a new, trimmed, non-empty and changed name. */
  onRename: (id: string, name: string) => Promise<void>;
  onExport: (id: string) => void;
  onDelete: (summary: BoardSummary) => void;
  /** The card of a board that was just imported. */
  highlighted?: boolean;
}

export function BoardCard({
  summary,
  href,
  now,
  onRename,
  onExport,
  onDelete,
  highlighted = false,
}: BoardCardProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const card = useRef<HTMLLIElement>(null);
  const moreWrap = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) moreButton.current?.focus();
  }, []);

  async function finishRename(save: boolean) {
    const next = (draft ?? '').trim();
    setDraft(null);
    if (save && next !== '' && next !== summary.name) await onRename(summary.id, next);
  }

  const classes = [styles.card, highlighted && styles.highlighted].filter(Boolean).join(' ');

  return (
    <li ref={card} className={classes} data-highlighted={highlighted || undefined}>
      <div className={styles.top}>
        {draft === null ? (
          <a className={styles.name} href={href}>
            {summary.name}
          </a>
        ) : (
          <RenameField draft={draft} card={card} onChange={setDraft} onDone={finishRename} />
        )}
        <div ref={moreWrap} className={styles.moreWrap}>
          <button
            ref={moreButton}
            type="button"
            className={styles.more}
            aria-label={`More For ${summary.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="ellipsis" size={18} />
          </button>
          {menuOpen && (
            <BoardMenu
              id={menuId}
              name={summary.name}
              wrapper={moreWrap}
              onClose={closeMenu}
              onRename={() => setDraft(summary.name)}
              onExport={() => onExport(summary.id)}
              onDelete={() => onDelete(summary)}
            />
          )}
        </div>
      </div>
      <p className={styles.meta}>{metaLine(summary, now, highlighted ? 'Imported' : 'Edited')}</p>
      {summary.firstHook !== null ? (
        <p className={styles.preview} data-testid="hook-preview">
          {summary.firstHook}
        </p>
      ) : (
        summary.hookCardCount === 0 && (
          <p className={styles.preview} data-testid="hook-preview">
            {NO_HOOK_CARD_TEXT}
          </p>
        )
      )}
      {summary.deckTypes.length > 0 && (
        <span className={styles.dots} aria-hidden="true">
          {summary.deckTypes.map((type) => (
            <span
              key={type}
              className={styles.dot}
              data-type={type}
              // The Hook Card has no deck color; its dot uses the accent (design 9.3).
              style={{ background: type === 'hook' ? 'var(--accent)' : `var(--deck-${type})` }}
            />
          ))}
        </span>
      )}
    </li>
  );
}

interface RenameFieldProps {
  draft: string;
  card: RefObject<HTMLLIElement | null>;
  onChange: (draft: string) => void;
  onDone: (save: boolean) => Promise<void>;
}

/** The name field, focused and selected, with the key hint. A click outside the card saves. */
function RenameField({ draft, card, onChange, onDone }: RenameFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(onDone);
  useEffect(() => {
    latest.current = onDone;
  });

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    const onPointerDown = (event: PointerEvent) => {
      if (!card.current?.contains(event.target as Node)) void latest.current(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [card]);

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
    <span className={styles.rename}>
      <input
        ref={input}
        className={styles.field}
        aria-label="Board Name"
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <span className={styles.hint}>Enter saves. Esc cancels.</span>
    </span>
  );
}
