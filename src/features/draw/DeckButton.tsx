/**
 * DeckButton: one 36 px deck button in the side rail (design 8.2): the deck icon in the
 * deck rail color, with no circle, and the deck name. onDraw gets the button's rect, which
 * is where the draw motion starts.
 */
import { TYPE_ICON } from '@/features/card';
import { DECK_NAME, type CardType } from '@/shared/model';
import { Icon } from '@/shared/ui';
import styles from './DeckButton.module.css';

/** "Draw A Player Role" and so on: the deck button and empty-panel label. */
export function drawLabel(type: CardType): string {
  return `Draw A ${DECK_NAME[type]}`;
}

interface DeckButtonProps {
  type: CardType;
  disabled: boolean;
  onDraw: (type: CardType, from: DOMRect) => void;
}

export function DeckButton({ type, disabled, onDraw }: DeckButtonProps) {
  return (
    <button
      type="button"
      className={styles.deck}
      aria-label={drawLabel(type)}
      disabled={disabled}
      onClick={(event) => onDraw(type, event.currentTarget.getBoundingClientRect())}
    >
      <span className={styles.icon} style={{ color: `var(--rail-${type})` }}>
        <Icon name={TYPE_ICON[type]} size={18} />
      </span>
      <span className={styles.name}>{DECK_NAME[type]}</span>
    </button>
  );
}
