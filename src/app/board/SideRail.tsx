/**
 * SideRail: the 232 px rail (design 8.2): the Hook Card button, then the Core group (Player
 * Role, Mechanic, Resource, Goal, Conflict), the Modifiers row of 3 icon buttons and the
 * Optional group (Setting; the other optional decks come in Phase 4), then Add Note and
 * the help panel pinned to the bottom. Genres and Settings come in later phases.
 */
import { DeckButton, HookButton } from '@/features/draw';
import { MOD_DECKS, type Deck, type ModDeck } from '@/shared/model';
import { Icon } from '@/shared/ui';
import styles from './SideRail.module.css';

interface SideRailProps {
  decksReady: boolean;
  onDraw: (type: Deck, from: DOMRect, modDeck?: ModDeck) => void;
  /** Draws a Hook Card; it needs no pool, so it is never off. */
  onDrawHook: (from: DOMRect) => void;
  onAddNote: () => void;
}

/** The Core group, in the design's order. */
const CORE: Deck[] = ['role', 'mechanic', 'resource', 'goal', 'conflict'];
/** The Optional group this phase ships. */
const OPTIONAL: Deck[] = ['setting'];

export function SideRail({ decksReady, onDraw, onDrawHook, onAddNote }: SideRailProps) {
  const button = (type: Deck) => (
    <DeckButton key={type} type={type} disabled={!decksReady} onDraw={onDraw} />
  );
  return (
    <aside className={styles.rail} aria-label="Decks">
      <HookButton onDraw={onDrawHook} />
      <h2 className={styles.label}>Core</h2>
      {CORE.map(button)}
      <h2 className={styles.label}>Modifiers</h2>
      <div className={styles.modifiers}>
        {MOD_DECKS.map((modDeck) => (
          <DeckButton
            key={modDeck}
            type="modifier"
            modDeck={modDeck}
            iconOnly
            disabled={!decksReady}
            onDraw={onDraw}
          />
        ))}
      </div>
      <h2 className={styles.label}>Optional</h2>
      {OPTIONAL.map(button)}
      <button type="button" className={styles.addNote} onClick={onAddNote}>
        <span className={styles.noteIcon}>
          <Icon name="note" size={16} />
        </span>
        Add Note
      </button>
      <div className={styles.help}>
        <p>Click a deck to draw one card.</p>
        <p>Point at a card. Click an arrow on the ring to turn it.</p>
        <p>
          Press <kbd className={styles.key}>R</kbd> to turn one step.
        </p>
        <p>Drag a card under another to tuck it.</p>
      </div>
    </aside>
  );
}
