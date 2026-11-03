/**
 * CardStrip: a card's strip menu (design 9.4): Split (combined cards, or a card with an
 * On Top Modifier), Redraw, Lock / Unlock and Discard. The canvas shows it on hover, 4 px
 * above the card.
 */
import styles from './CardStrip.module.css';

interface CardStripProps {
  /** Shows Split: the card has a merged ring or an On Top Modifier. */
  canSplit: boolean;
  locked: boolean;
  redrawDisabled?: boolean;
  onSplit: () => void;
  onRedraw: () => void;
  onLock: () => void;
  onDiscard: () => void;
}

export function CardStrip({
  canSplit,
  locked,
  redrawDisabled = false,
  onSplit,
  onRedraw,
  onLock,
  onDiscard,
}: CardStripProps) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Card Actions" data-testid="card-strip">
      {canSplit && (
        <button type="button" className={`${styles.button} ${styles.split}`} onClick={onSplit}>
          Split
        </button>
      )}
      <button type="button" className={styles.button} disabled={redrawDisabled} onClick={onRedraw}>
        Redraw
      </button>
      <button type="button" className={styles.button} aria-pressed={locked} onClick={onLock}>
        {locked ? 'Unlock' : 'Lock'}
      </button>
      <button type="button" className={`${styles.button} ${styles.discard}`} onClick={onDiscard}>
        Discard
      </button>
    </div>
  );
}
