/**
 * GenreCount: the genre count pill on a genre-tagged deck button (design 8.2). It shows the
 * number of genres on for the deck and hides at all 21. Its label reads "N genres on".
 */
import { genresOnLabel, showCount } from './genreRules';
import styles from './GenreCount.module.css';

interface GenreCountProps {
  count: number;
  /** Lets the deck button point aria-describedby at the pill. */
  id?: string;
}

export function GenreCount({ count, id }: GenreCountProps) {
  if (!showCount(count)) return null;
  return (
    <span id={id} role="img" aria-label={genresOnLabel(count)} className={styles.pill}>
      {count}
    </span>
  );
}
