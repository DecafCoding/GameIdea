/**
 * GenresPanel: the Genres panel (design 9.10) on the shared Dialog. The top row picks
 * genres for all 4 genre-tagged decks; each deck row turns a picked genre off or on for
 * that deck only. Each deck keeps at least 1 genre. Every click applies and saves at once
 * (onChange), so there is no Cancel; Done, × and Esc only close. The parent mounts it only
 * while open, so the top row starts from the board's genres on every open (design 13:
 * picked is view state, never stored).
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
import { Button, Dialog, Icon } from '@/shared/ui';
import {
  allOn,
  canTurnOffDeckGenre,
  canTurnOffPicked,
  pickedGenres,
  toggleDeckGenre,
  togglePicked,
} from './genreRules';
import styles from './GenresPanel.module.css';

export const GENRES_HELP_TEXT =
  'Pick genres at the top. Each genre you pick shows on the 4 genre decks below, already on. Turn one off to keep it out of that deck. A change applies to the next draw only. Cards on the board keep their cues.';

export const GENRES_FOOTER_TEXT = 'Each deck keeps at least 1 genre.';

interface GenresPanelProps {
  genres: DeckGenres;
  /** Called with the new genres after each click that changes them. */
  onChange: (genres: DeckGenres) => void;
  onClose: () => void;
}

export function GenresPanel({ genres, onChange, onClose }: GenresPanelProps) {
  const [picked, setPicked] = useState<Genre[]>(() => pickedGenres(genres));

  const apply = (next: DeckGenres) => {
    if (next !== genres) onChange(next);
  };

  return (
    <Dialog
      open
      size="panel"
      showClose
      title="Genres"
      caption={GENRES_HELP_TEXT}
      footerNote={GENRES_FOOTER_TEXT}
      onClose={onClose}
      actions={
        <Button variant="primary" data-autofocus onClick={onClose}>
          Done
        </Button>
      }
    >
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
    </Dialog>
  );
}
