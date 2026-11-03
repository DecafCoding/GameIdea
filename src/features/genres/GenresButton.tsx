/**
 * GenresButton: the rail's Genres button (design 8.2): the sliders icon, "Genres" and a
 * count line with the number of genres on across the 4 genre-tagged decks ("All genres" at
 * 21). It opens the Genres panel and needs no pool, so it stays on when the pools fail.
 */
import { useId } from 'react';
import type { DeckGenres } from '@/shared/model';
import { Icon } from '@/shared/ui';
import { genreCountText, pickedGenres } from './genreRules';
import styles from './GenresButton.module.css';

interface GenresButtonProps {
  genres: DeckGenres;
  onOpen: () => void;
}

export function GenresButton({ genres, onOpen }: GenresButtonProps) {
  const lineId = useId();
  return (
    <button
      type="button"
      className={styles.button}
      aria-label="Genres"
      aria-describedby={lineId}
      onClick={onOpen}
    >
      <span className={styles.icon}>
        <Icon name="sliders-horizontal" size={18} />
      </span>
      <span className={styles.lines}>
        <span className={styles.name}>Genres</span>
        <span id={lineId} className={styles.line}>
          {genreCountText(pickedGenres(genres).length)}
        </span>
      </span>
    </button>
  );
}
