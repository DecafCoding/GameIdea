/**
 * GenresTab: the Genres tab of the Settings dialog (design 9.10). app/ mounts it inside
 * SettingsDialog; it has no dialog of its own. The top row picks genres for all 4
 * genre-tagged decks; each deck row turns a picked genre off or on for that deck only. Each
 * deck keeps at least 1 genre. Every click applies and saves at once (onChange). It mounts
 * only while the tab shows, so the top row starts from the board's genres each time
 * (design 13: picked is view state, never stored).
 */
import { useState } from 'react';
import { iconFor } from '@/features/card';
import {
  DECK_NAME,
  GENRE_DECKS,
  GENRE_NAME,
  GENRES,
  type DeckGenres,
  type Genre,
} from '@/shared/model';
import { Icon } from '@/shared/ui';
import {
  allOn,
  canTurnOffDeckGenre,
  canTurnOffPicked,
  pickedGenres,
  toggleDeckGenre,
  togglePicked,
} from './genreRules';
import styles from './GenresTab.module.css';

/** The scope line under the Settings tab bar on the Genres tab (design 9.10, verbatim). */
export const GENRES_SCOPE_TEXT =
  'These genres apply to this board only. Pick genres at the top. Each genre you pick shows on the 4 genre decks below, already on. Turn one off to keep it out of that deck. A change applies to the next draw only. Cards on the board keep their cues. The other 7 decks are not filtered by genres.';

export const GENRES_FOOTER_TEXT = 'Each deck keeps at least 1 genre.';

interface GenresTabProps {
  genres: DeckGenres;
  /** Called with the new genres after each click that changes them. */
  onChange: (genres: DeckGenres) => void;
}

export function GenresTab({ genres, onChange }: GenresTabProps) {
  const [picked, setPicked] = useState<Genre[]>(() => pickedGenres(genres));

  const apply = (next: DeckGenres) => {
    if (next !== genres) onChange(next);
  };

  return (
    <>
      <section className={styles.top} aria-label="All 4 Decks">
        <div className={styles.topHeader}>
          <h3 className={styles.groupLabel}>All 4 Decks</h3>
          <button
            type="button"
            className={styles.allOn}
            onClick={() => {
              apply(allOn(genres));
              setPicked([...GENRES]);
            }}
          >
            All On
          </button>
        </div>
        <div className={styles.chips}>
          {GENRES.map((genre) => {
            const on = picked.includes(genre);
            const locked = on && !canTurnOffPicked(genres, genre);
            return (
              <button
                key={genre}
                type="button"
                className={`${styles.chip} ${styles.topChip}`}
                aria-pressed={on}
                disabled={locked}
                title={locked ? GENRES_FOOTER_TEXT : undefined}
                onClick={() => {
                  const next = togglePicked(genres, picked, genre);
                  setPicked(next.picked);
                  apply(next.genres);
                }}
              >
                {GENRE_NAME[genre]}
              </button>
            );
          })}
        </div>
      </section>
      {GENRE_DECKS.map((deck) => (
        <div key={deck} role="group" aria-label={DECK_NAME[deck]} className={styles.row}>
          <div className={styles.deckName}>
            <span className={styles.deckIcon} style={{ color: `var(--rail-${deck})` }}>
              <Icon name={iconFor({ type: deck })} size={18} />
            </span>
            {DECK_NAME[deck]}
          </div>
          <div className={styles.chips}>
            {picked.map((genre) => {
              const on = genres[deck].includes(genre);
              const locked = on && !canTurnOffDeckGenre(genres, deck, genre);
              return (
                <button
                  key={genre}
                  type="button"
                  className={`${styles.chip} ${styles.deckChip}`}
                  aria-pressed={on}
                  disabled={locked}
                  title={locked ? GENRES_FOOTER_TEXT : undefined}
                  onClick={() => apply(toggleDeckGenre(genres, deck, genre))}
                >
                  {GENRE_NAME[genre]}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
