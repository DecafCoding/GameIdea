/**
 * SideRail: the 232 px rail (design 8.2): the Decks group label, 5 deck buttons in rail
 * order, Add Note, and the help panel pinned to the bottom. The grouped rail (Hook Card,
 * Core, Modifiers, Optional, Genres) and Settings come in later phases.
 */
import { DeckButton } from '@/features/draw';
import type { Deck, ModDeck } from '@/shared/model';
import { Icon } from '@/shared/ui';
import styles from './SideRail.module.css';

interface SideRailProps {
  decksReady: boolean;
  onDraw: (type: Deck, from: DOMRect, modDeck?: ModDeck) => void;
  onAddNote: () => void;
}

/** The Phase 1 rail, unchanged until the grouped rail lands. */
const PHASE1_RAIL: Deck[] = ['role', 'goal', 'conflict', 'modifier', 'setting'];

export function SideRail({ decksReady, onDraw, onAddNote }: SideRailProps) {
  return (
    <aside className={styles.rail} aria-label="Decks">
      <h2 className={styles.label}>Decks</h2>
      {PHASE1_RAIL.map((type) => (
        <DeckButton
          key={type}
          type={type}
          disabled={!decksReady}
          onDraw={(deck, from) => onDraw(deck, from, deck === 'modifier' ? 'role' : undefined)}
        />
      ))}
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
