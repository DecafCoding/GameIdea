/**
 * GenreButton: the 36 px square button to the right of a genre-tagged deck button in the
 * rail (Mechanic, Resource, Progression, Constraint). It shows how many genres the deck has
 * on, or the drama icon when all 21 are on, in the theme color. Its hover label is "Edit
 * Genres", and a click opens the Settings Genres tab.
 */
import { DECK_NAME, type GenreDeck } from '@/shared/model';
import { Icon } from '@/shared/ui';
import { genresOnLabel, showCount } from './genreRules';
import styles from './GenreButton.module.css';

interface GenreButtonProps {
  deck: GenreDeck;
  /** How many genres the deck has on. */
  count: number;
  onEdit: () => void;
}

/** The button's name: "Edit Mechanic Genres, 3 genres on" or "…, all genres on". */
export function genreButtonLabel(deck: GenreDeck, count: number): string {
  const on = showCount(count) ? genresOnLabel(count) : 'all genres on';
  return `Edit ${DECK_NAME[deck]} Genres, ${on}`;
}

export function GenreButton({ deck, count, onEdit }: GenreButtonProps) {
  const narrowed = showCount(count);
  return (
    <button
      type="button"
      className={styles.button}
      title="Edit Genres"
      aria-label={genreButtonLabel(deck, count)}
      aria-haspopup="dialog"
      onClick={onEdit}
    >
      {narrowed ? count : <Icon name="drama" size={18} />}
    </button>
  );
}
