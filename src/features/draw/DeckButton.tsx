/**
 * DeckButton: one 36 px deck button in the side rail (design 8.2): the deck icon in the
 * deck rail color, with no circle, and the deck name. A Modifier deck button names its
 * Modifier deck and may be icon-only, with the name as its hover label. onDraw gets the
 * button's rect, which is where the draw motion starts.
 */
import { iconFor } from '@/features/card';
import { DECK_NAME, MOD_DECK_NAME, type CardType, type Deck, type ModDeck } from '@/shared/model';
import { Icon } from '@/shared/ui';
import styles from './DeckButton.module.css';

/** The deck's name: "Player Role", or "Resource Modifier" for a Modifier deck. */
export function deckLabel(type: CardType, modDeck?: ModDeck): string {
  return type === 'modifier' && modDeck ? MOD_DECK_NAME[modDeck] : DECK_NAME[type];
}

/** "Draw A Player Role", "Draw A Resource Modifier": the deck button and empty-panel label. */
export function drawLabel(type: CardType, modDeck?: ModDeck): string {
  return `Draw A ${deckLabel(type, modDeck)}`;
}

interface DeckButtonProps {
  type: Deck;
  /** The Modifier deck, for a Modifier deck button. */
  modDeck?: ModDeck;
  /** The icon alone, centered; the name is the hover label (the Modifiers row). */
  iconOnly?: boolean;
  disabled: boolean;
  onDraw: (type: Deck, from: DOMRect, modDeck?: ModDeck) => void;
}

export function DeckButton({ type, modDeck, iconOnly = false, disabled, onDraw }: DeckButtonProps) {
  const name = deckLabel(type, modDeck);
  return (
    <button
      type="button"
      className={`${styles.deck} ${iconOnly ? styles.iconOnly : ''}`}
      aria-label={drawLabel(type, modDeck)}
      title={iconOnly ? name : undefined}
      disabled={disabled}
      onClick={(event) => onDraw(type, event.currentTarget.getBoundingClientRect(), modDeck)}
    >
      <span className={styles.icon} style={{ color: `var(--rail-${type})` }}>
        <Icon name={iconFor({ type, modDeck })} size={18} />
      </span>
      {!iconOnly && <span className={styles.name}>{name}</span>}
    </button>
  );
}

interface HookButtonProps {
  onDraw: (from: DOMRect) => void;
}

/**
 * The Hook Card button at the top of the rail (design 8.2): a deck button with an accent
 * border and fill. It needs no pool, so it stays on when the pools fail.
 */
export function HookButton({ onDraw }: HookButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.deck} ${styles.hook}`}
      aria-label="Draw A Hook Card"
      onClick={(event) => onDraw(event.currentTarget.getBoundingClientRect())}
    >
      <span className={styles.icon} style={{ color: 'var(--accent)' }}>
        <Icon name="hook" size={18} />
      </span>
      <span className={styles.name}>{DECK_NAME.hook}</span>
    </button>
  );
}
