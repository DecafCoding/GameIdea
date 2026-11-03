/**
 * DeckButton: one 56 px deck in the side rail (design section 8): the type disc, the deck
 * name and a caption with the cue count and meaning. onDraw gets the button's rect, which
 * is where the draw motion starts.
 */
import { TypeDisc } from '@/features/card';
import type { CardType } from '@/shared/model';
import styles from './DeckButton.module.css';

const NAME: Record<CardType, string> = {
  character: 'Character',
  motivation: 'Motivation',
  setting: 'Setting',
  conflict: 'Conflict',
  description: 'Description',
};

const CAPTION: Record<CardType, string> = {
  character: '4 cues · a person or being',
  motivation: '2 cues · a goal or desire',
  setting: '4 cues · place, object or event',
  conflict: '2 cues · an obstacle',
  description: '4 cues · an adjective',
};

/** "Draw A Character" and so on: the deck button and empty-panel label. */
export function drawLabel(type: CardType): string {
  return `Draw A ${NAME[type]}`;
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
        <span className={styles.name}>{NAME[type]}</span>
        <span className={styles.caption}>{CAPTION[type]}</span>
      </span>
    </button>
  );
}
