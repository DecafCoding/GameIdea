/**
 * CardStrip: the selected card's strip (design 9.2): Split (combined cards only), Redraw
 * and Discard. The canvas places it above the card.
 */
import styles from './CardStrip.module.css';

interface CardStripProps {
  combined: boolean;
  redrawDisabled?: boolean;
  onSplit: () => void;
  onRedraw: () => void;
  onDiscard: () => void;
}

export function CardStrip({
  combined,
  redrawDisabled = false,
  onSplit,
  onRedraw,
  onDiscard,
}: CardStripProps) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Card Actions" data-testid="card-strip">
      {combined && (
        <button type="button" className={`${styles.button} ${styles.split}`} onClick={onSplit}>
          Split
        </button>
      )}
      <button type="button" className={styles.button} disabled={redrawDisabled} onClick={onRedraw}>
        Redraw
      </button>
      <button type="button" className={`${styles.button} ${styles.discard}`} onClick={onDiscard}>
        Discard
      </button>
    </div>
  );
}
