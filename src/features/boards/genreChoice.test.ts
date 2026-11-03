/**
 * Tests for the choice rules of the 2-step New Board dialog: step 1 nesting and the
 * at-least-1 rule, step 2 chips and the last-chip rule, Back after off and on, and the name.
 */
import { describe, expect, it } from 'vitest';
import { everyDeck, GENRES, type CardType, type Genre } from '@/shared/model';
import {
  boardName,
  canGoNext,
  chooseGenre,
  deckChips,
  deckGenres,
  initialChoice,
  setGenre,
  toggleChip,
  type GenreChoice,
} from './genreChoice';

/** Toggles a chip and fails the test if the rule blocks it. */
function toggle(choice: GenreChoice, deck: CardType, genre: Genre): GenreChoice {
  const next = toggleChip(choice, deck, genre);
  if (!next) throw new Error('toggle blocked');
  return next;
}

describe('setGenre', () => {
  it('setGenre_checkCyberpunk_alsoChecksSciFi', () => {
    expect(setGenre(['generic'], 'cyberpunk', true)).toEqual(['generic', 'sci-fi', 'cyberpunk']);
  });

  it('setGenre_checkSpaceOpera_alsoChecksSciFi', () => {
    expect(setGenre([], 'space-opera', true)).toEqual(['sci-fi', 'space-opera']);
  });

  it('setGenre_clearSciFi_keepsSubGenres', () => {
    expect(setGenre(GENRES, 'sci-fi', false)).toEqual(['generic', 'cyberpunk', 'space-opera']);
  });

  it('setGenre_clearAll_empty', () => {
    let chosen = [...GENRES];
    for (const genre of GENRES) chosen = setGenre(chosen, genre, false);
    expect(chosen).toEqual([]);
  });

  it('setGenre_anyOrder_resultInGenresOrder', () => {
    expect(setGenre(['space-opera', 'generic'], 'generic', true)).toEqual([
      'generic',
      'space-opera',
    ]);
  });
});

describe('step 1', () => {
  it('initialChoice_opens_allGenresNothingOff', () => {
    const choice = initialChoice();
    expect(choice.genres).toEqual([...GENRES]);
    expect(deckGenres(choice)).toEqual(everyDeck(GENRES));
  });

  it('canGoNext_noGenre_false', () => {
    let choice = initialChoice();
    for (const genre of GENRES) choice = chooseGenre(choice, genre, false);
    expect(canGoNext(choice)).toBe(false);
  });

  it('canGoNext_oneGenre_true', () => {
    let choice = initialChoice();
    for (const genre of ['generic', 'sci-fi', 'space-opera'] as const) {
      choice = chooseGenre(choice, genre, false);
    }
    expect(choice.genres).toEqual(['cyberpunk']);
    expect(canGoNext(choice)).toBe(true);
  });

  it('chooseGenre_turnOffGenre_dropsItsChipsInEveryRow', () => {
    let choice = toggle(initialChoice(), 'character', 'generic');
    choice = chooseGenre(choice, 'generic', false);
    expect(choice.off.character).toEqual([]);
    for (const deck of ['character', 'setting'] as const) {
      expect(deckChips(choice, deck).map((c) => c.genre)).toEqual([
        'sci-fi',
        'cyberpunk',
        'space-opera',
      ]);
    }
  });

  it('chooseGenre_turnOnAgain_startsOnInEveryRow', () => {
    let choice = toggle(initialChoice(), 'motivation', 'generic');
    choice = chooseGenre(choice, 'generic', false);
    choice = chooseGenre(choice, 'generic', true);
    expect(deckChips(choice, 'motivation')).toContainEqual({ genre: 'generic', on: true });
  });

  it('chooseGenre_genreStaysOn_keepsEachRowState', () => {
    let choice = toggle(initialChoice(), 'setting', 'cyberpunk');
    choice = chooseGenre(choice, 'generic', false);
    expect(choice.off.setting).toEqual(['cyberpunk']);
    expect(choice.off.character).toEqual([]);
  });

  it('chooseGenre_rowLosesItsLastOnChip_rowTurnsAllOn', () => {
    let choice = initialChoice();
    for (const genre of ['generic', 'sci-fi', 'space-opera'] as const) {
      choice = toggle(choice, 'character', genre);
    }
    expect(deckGenres(choice).character).toEqual(['cyberpunk']);
    choice = chooseGenre(choice, 'cyberpunk', false);
    expect(deckChips(choice, 'character').every((c) => c.on)).toBe(true);
    expect(deckGenres(choice).character).toEqual(['generic', 'sci-fi', 'space-opera']);
  });

  it('chooseGenre_cyberpunk_alsoAddsSciFiChips', () => {
    let choice = initialChoice();
    for (const genre of GENRES) choice = chooseGenre(choice, genre, false);
    choice = chooseGenre(choice, 'cyberpunk', true);
    expect(deckChips(choice, 'conflict')).toEqual([
      { genre: 'sci-fi', on: true },
      { genre: 'cyberpunk', on: true },
    ]);
  });
});

describe('step 2', () => {
  it('deckChips_order_followsStep1Order', () => {
    let choice = initialChoice();
    for (const genre of GENRES) choice = chooseGenre(choice, genre, false);
    choice = chooseGenre(choice, 'space-opera', true);
    choice = chooseGenre(choice, 'generic', true);
    expect(deckChips(choice, 'description').map((c) => c.genre)).toEqual([
      'generic',
      'sci-fi',
      'space-opera',
    ]);
  });

  it('toggleChip_lastOnChip_returnsNull', () => {
    let choice = initialChoice();
    for (const genre of ['generic', 'sci-fi', 'cyberpunk'] as const) {
      choice = toggle(choice, 'character', genre);
    }
    expect(toggleChip(choice, 'character', 'space-opera')).toBeNull();
  });

  it('toggleChip_offChip_turnsOn', () => {
    let choice = toggle(initialChoice(), 'setting', 'generic');
    expect(deckChips(choice, 'setting')[0]).toEqual({ genre: 'generic', on: false });
    choice = toggle(choice, 'setting', 'generic');
    expect(deckChips(choice, 'setting')[0]).toEqual({ genre: 'generic', on: true });
  });

  it('deckGenres_mixed_eachDeckItsOwnList', () => {
    let choice = chooseGenre(initialChoice(), 'generic', false);
    choice = toggle(choice, 'character', 'sci-fi');
    choice = toggle(choice, 'character', 'space-opera');
    choice = toggle(choice, 'setting', 'cyberpunk');
    expect(deckGenres(choice)).toEqual({
      ...everyDeck(['sci-fi', 'cyberpunk', 'space-opera']),
      character: ['cyberpunk'],
      setting: ['sci-fi', 'space-opera'],
    });
  });
});

describe('boardName', () => {
  it('boardName_blank_untitledBoard', () => {
    expect(boardName('   ')).toBe('Untitled Board');
    expect(boardName('')).toBe('Untitled Board');
  });

  it('boardName_padded_trimmed', () => {
    expect(boardName('  Salvage Run ')).toBe('Salvage Run');
  });
});
