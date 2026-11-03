/**
 * DeckButton: one 56 px deck in the side rail (design section 8): the type disc, the deck
 * name and a caption with the cue count and meaning. onDraw gets the button's rect, which
 * is where the draw motion starts.
 */
import { TypeDisc } from '@/features/card';
import { DECK_NAME, type CardType } from '@/shared/model';
import styles from './DeckButton.module.css';

const CAPTION: Record<CardType, string> = {
  role: '4 cues · who you play',
  goal: '2 cues · what you must do',
  conflict: '2 cues · what stands in the way',
  modifier: '4 cues · an adjective',
  setting: '4 cues · where it happens',
};

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
      <TypeDisc type={type} size={36} />
      <span className={styles.words}>
        <span className={styles.name}>{DECK_NAME[type]}</span>
        <span className={styles.caption}>{CAPTION[type]}</span>
      </span>
    </button>
  );
}
