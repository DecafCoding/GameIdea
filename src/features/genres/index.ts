/**
 * Genres feature: the public entry for the Genres tab, its rules and the genre counts.
 */
export {
  allOn,
  canTurnOffDeckGenre,
  canTurnOffPicked,
  genreCountText,
  genresOnLabel,
  normalize,
  pickedGenres,
  showCount,
  toggleDeckGenre,
  togglePicked,
} from './genreRules';
export { GenreCount } from './GenreCount';
export { GenresButton } from './GenresButton';
export { GENRES_FOOTER_TEXT, GENRES_SCOPE_TEXT, GenresTab } from './GenresTab';
