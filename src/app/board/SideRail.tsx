/**
 * SideRail: the 232 px rail (design 8.2): the Hook Card button, then the Core group (Player
 * Role, Mechanic, Resource, Goal, Conflict), the Modifiers row of 3 icon buttons and the
 * Optional group (Setting, Mood, Twist, Progression, Constraint), then Add Note and Settings
 * at the bottom (margin-top auto; when the rail overflows and scrolls, Settings simply follows
 * Add Note). Genres live on the Settings Genres tab, so there is no Genres group (design 8.2,
 * 2026-11-04). The Settings button shows pressed (aria-expanded) while its dialog is open.
 * Each genre-tagged deck button (Mechanic, Resource, Progression, Constraint) has an Edit
 * Genres button to its right (user 2026-11-05): the count of genres on, or the drama icon at
 * all 21. It opens the Settings Genres tab.
 */
import { DeckButton, HookButton } from '@/features/draw';
import { GenreButton } from '@/features/genres';
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
  /** Draws a Hook Card; it needs no pool, so the pools never turn it off. */
  onDrawHook: (from: DOMRect) => void;
  /** True on a One-Pager board: the Hook Card button is off (it keeps 1 Hook Card). */
  hookDisabled?: boolean;
  onAddNote: () => void;
  /** The open board's deck genres, for the Edit Genres buttons. */
  genres: DeckGenres;
  onOpenSettings: () => void;
  /** Opens Settings on the Genres tab. */
  onEditGenres: () => void;
  /** True while the Settings dialog is open: the Settings button shows pressed. */
  settingsOpen: boolean;
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
  hookDisabled = false,
  onAddNote,
  genres,
  onOpenSettings,
  onEditGenres,
  settingsOpen,
}: SideRailProps) {
  const button = (type: Deck) => {
    if (!isGenreDeck(type)) {
      return <DeckButton key={type} type={type} disabled={!decksReady} onDraw={onDraw} />;
    }
    return (
      <div key={type} className={styles.deckRow}>
        <DeckButton type={type} disabled={!decksReady} onDraw={onDraw} />
        <GenreButton deck={type} count={genres[type].length} onEdit={onEditGenres} />
      </div>
    );
  };
  return (
    <aside className={styles.rail} aria-label="Decks">
      <HookButton onDraw={onDrawHook} disabled={hookDisabled} />
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
        <Icon name="note" size={18} className={styles.addNoteIcon} />
        Add Note
      </button>
      <button
        type="button"
        className={styles.settings}
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        onClick={onOpenSettings}
      >
        <Icon name="settings" size={18} />
        Settings
      </button>
    </aside>
  );
}
