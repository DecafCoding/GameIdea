/**
 * SideRail: the 232 px rail (design 8.2): the Hook Card button, then the Core group (Player
 * Role, Mechanic, Resource, Goal, Conflict), the Modifiers row of 3 icon buttons and the
 * Optional group (Setting, Mood, Twist, Progression, Constraint), the Genres group with the
 * Genres button and its count line, then Add Note and the help panel pinned to the bottom.
 * Each genre-tagged deck button (Mechanic, Resource, Progression, Constraint) carries a genre
 * count pill (design 8.2), hidden at all 21 genres. Settings comes in Phase 5.
 */
import { useId } from 'react';
import { DeckButton, HookButton } from '@/features/draw';
import { GenreCount, GenresButton, showCount } from '@/features/genres';
import {
  GENRE_DECKS,
  MOD_DECKS,
  type Deck,
  type DeckGenres,
  type GenreDeck,
  type ModDeck,
} from '@/shared/model';
import { Icon } from '@/shared/ui';
import styles from './SideRail.module.css';

interface SideRailProps {
  decksReady: boolean;
  onDraw: (type: Deck, from: DOMRect, modDeck?: ModDeck) => void;
  /** Draws a Hook Card; it needs no pool, so it is never off. */
  onDrawHook: (from: DOMRect) => void;
  onAddNote: () => void;
  /** The open board's deck genres, for the count pills and the Genres line. */
  genres: DeckGenres;
  onOpenGenres: () => void;
}

/** The Core group, in the design's order. */
const CORE: Deck[] = ['role', 'mechanic', 'resource', 'goal', 'conflict'];
/** The Optional group, in the design's order. */
const OPTIONAL: Deck[] = ['setting', 'mood', 'twist', 'progression', 'constraint'];

function isGenreDeck(type: Deck): type is GenreDeck {
  return (GENRE_DECKS as readonly Deck[]).includes(type);
}

export function SideRail({
  decksReady,
  onDraw,
  onDrawHook,
  onAddNote,
  genres,
  onOpenGenres,
}: SideRailProps) {
  const idPrefix = useId();
  const button = (type: Deck) => {
    if (!isGenreDeck(type)) {
      return <DeckButton key={type} type={type} disabled={!decksReady} onDraw={onDraw} />;
    }
    const count = genres[type].length;
    const pillId = `${idPrefix}-${type}-genres`;
    return (
      <DeckButton
        key={type}
        type={type}
        disabled={!decksReady}
        onDraw={onDraw}
        trailing={<GenreCount id={pillId} count={count} />}
        describedBy={showCount(count) ? pillId : undefined}
      />
    );
  };
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
      <h2 className={styles.label}>Genres</h2>
      <GenresButton genres={genres} onOpen={onOpenGenres} />
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
