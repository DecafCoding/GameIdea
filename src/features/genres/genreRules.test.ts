/**
 * Tests for the pure Genres tab rules.
 */
import { describe, expect, it } from 'vitest';
import { allGenresOn, GENRE_DECKS, GENRES, type DeckGenres, type Genre } from '@/shared/model';
import {
  allOn,
  canTurnOffDeckGenre,
  canTurnOffPicked,
  genresOnLabel,
  normalize,
  pickedGenres,
  showCount,
  toggleDeckGenre,
  togglePicked,
} from './genreRules';

function frozen(genres: DeckGenres): DeckGenres {
  for (const deck of GENRE_DECKS) Object.freeze(genres[deck]);
  return Object.freeze(genres);
}

const some = (): DeckGenres =>
  frozen({
    mechanic: ['puzzle', 'rpg'],
    resource: ['roguelike'],
    progression: ['rpg', 'horror'],
    constraint: ['rpg'],
  });

describe('genreRules', () => {
  it('normalize_shuffledWithRepeats_genresOrderNoRepeats', () => {
    expect(normalize(['rpg', 'roguelike', 'rpg'])).toEqual(['roguelike', 'rpg']);
  });

  it('pickedGenres_fourLists_unionInGenresOrder', () => {
    expect(pickedGenres(some())).toEqual(['roguelike', 'puzzle', 'rpg', 'horror']);
  });

  it('togglePicked_offToOn_addsToAll4Decks', () => {
    const genres = some();
    const picked = Object.freeze(pickedGenres(genres)) as Genre[];
    const out = togglePicked(genres, picked, 'metroidvania');
    expect(out.picked).toEqual(['roguelike', 'metroidvania', 'puzzle', 'rpg', 'horror']);
    for (const deck of GENRE_DECKS) expect(out.genres[deck]).toContain('metroidvania');
    expect(out.genres.resource).toEqual(['roguelike', 'metroidvania']);
  });

  it('togglePicked_onToOff_removesFromAll4Decks', () => {
    const genres = frozen({ ...allGenresOn() });
    const out = togglePicked(genres, [...GENRES], 'roguelike');
    expect(out.picked).not.toContain('roguelike');
    for (const deck of GENRE_DECKS) {
      expect(out.genres[deck]).toHaveLength(20);
      expect(out.genres[deck]).not.toContain('roguelike');
    }
  });

  it('togglePicked_deckWouldBeEmpty_blockedSameObjects', () => {
    const genres = some();
    const picked = pickedGenres(genres);
    expect(canTurnOffPicked(genres, 'rpg')).toBe(false);
    const out = togglePicked(genres, picked, 'rpg');
    expect(out.genres).toBe(genres);
    expect(out.picked).toBe(picked);
  });

  it('toggleDeckGenre_lastGenre_blockedSameObject', () => {
    const genres = some();
    expect(canTurnOffDeckGenre(genres, 'resource', 'roguelike')).toBe(false);
    expect(toggleDeckGenre(genres, 'resource', 'roguelike')).toBe(genres);
  });

  it('toggleDeckGenre_off_changesOnlyThatDeck', () => {
    const genres = some();
    const out = toggleDeckGenre(genres, 'mechanic', 'rpg');
    expect(out.mechanic).toEqual(['puzzle']);
    expect(out.progression).toBe(genres.progression);
  });

  it('toggleDeckGenre_on_keepsGenresOrder', () => {
    const out = toggleDeckGenre(some(), 'mechanic', 'roguelike');
    expect(out.mechanic).toEqual(['roguelike', 'puzzle', 'rpg']);
  });

  it('allOn_narrowed_resetsEveryDeck', () => {
    expect(allOn(some())).toEqual(allGenresOn());
  });

  it('allOn_alreadyAllOn_sameObject', () => {
    const genres = frozen(allGenresOn());
    expect(allOn(genres)).toBe(genres);
  });

  it('genresOnLabel_counts_singularPlural', () => {
    expect(genresOnLabel(1)).toBe('1 genre on');
    expect(genresOnLabel(3)).toBe('3 genres on');
  });

  it('showCount_counts_hiddenAt21', () => {
    expect(showCount(20)).toBe(true);
    expect(showCount(21)).toBe(false);
  });
});
