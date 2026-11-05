/**
 * Tests for the pure Concept panel rules: place, width, lanes, counts, enter, leave, pop
 * out, drag out, chip drops (combine, On Top, swap), the result text, resize and the drop
 * routing over the panel.
 */
import { describe, expect, it } from 'vitest';
import { DECKS, type Board, type Card } from '@/shared/model';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  onePagerBoard,
  secondModifier,
  onePagerWithLoop,
} from '@/test/fixtures/boards';
import { dropCard } from './boardActions';
import {
  chipDropAction,
  chipResultText,
  combineOntoChip,
  conceptDrop,
  conceptLanes,
  conceptPlace,
  conceptWidth,
  dragOutOfConcept,
  enterConcept,
  leaveConcept,
  moveConcept,
  onePagerCardCount,
  pinConcept,
  popOutOfConcept,
  resizeConcept,
  titleCaseWords,
} from './concept';
import { CARD_SIZE } from './placement';
import { cardText } from './reading';
import { descendantsOf } from './stack';

const get = (board: Board, id: string): Card => board.cards.find((c) => c.id === id)!;
const withCards = (board: Board, cards: Card[]): Board => ({
  ...board,
  cards: [...board.cards, ...cards],
});
const cue = (texts: string[]) => ({ cues: texts.map((text) => ({ text })), activeIndex: 0 });

describe('Concept read side', () => {
  it('conceptPlace_hookAt96_panelAt364', () => {
    expect(conceptPlace(onePagerBoard())).toEqual({ x: 364, y: 96 });
  });

  it('conceptPlace_freeForm_null', () => {
    expect(conceptPlace(fixtureBoard([fixtureCard('hook')]))).toBeNull();
  });

  it('conceptPlace_savedPos_usedAndHookMoveIgnored', () => {
    const board = { ...onePagerBoard(), conceptPos: { x: 720, y: 480 } };
    expect(conceptPlace(board)).toEqual({ x: 720, y: 480 });
    const movedHook = {
      ...board,
      cards: board.cards.map((c) => (c.type === 'hook' ? { ...c, x: 0, y: 0 } : c)),
    };
    expect(conceptPlace(movedHook)).toEqual({ x: 720, y: 480 });
  });

  it('moveConcept_newPlace_savesConceptPos', () => {
    const next = moveConcept(onePagerBoard(), 600, 312);
    expect(next.conceptPos).toEqual({ x: 600, y: 312 });
    expect(conceptPlace(next)).toEqual({ x: 600, y: 312 });
  });

  it('pinConcept_hookMovedWithNoSavedPlace_panelKeepsOldPlace', () => {
    const before = onePagerBoard();
    const after = {
      ...before,
      cards: before.cards.map((c) => (c.type === 'hook' ? { ...c, x: 480, y: 600 } : c)),
    };
    const pinned = pinConcept(before, after);
    expect(pinned.conceptPos).toEqual({ x: 364, y: 96 });
    expect(conceptPlace(pinned)).toEqual({ x: 364, y: 96 });
  });

  it('pinConcept_hookNotMovedOrPlaceSaved_sameBoard', () => {
    const before = onePagerBoard();
    expect(pinConcept(before, before)).toBe(before);
    const saved = { ...before, conceptPos: { x: 600, y: 312 } };
    const moved = {
      ...saved,
      cards: saved.cards.map((c) => (c.type === 'hook' ? { ...c, x: 480 } : c)),
    };
    expect(pinConcept(saved, moved)).toBe(moved);
  });

  it('moveConcept_samePlaceOrFreeForm_sameBoard', () => {
    const moved = moveConcept(onePagerBoard(), 600, 312);
    expect(moveConcept(moved, 600, 312)).toBe(moved);
    const free = fixtureBoard([fixtureCard('hook')]);
    expect(moveConcept(free, 600, 312)).toBe(free);
  });

  it('conceptLanes_mixedDecks_railOrder', () => {
    expect(conceptLanes(onePagerBoard()).map((lane) => lane.deck)).toEqual([
      'mechanic',
      'resource',
      'setting',
    ]);
  });

  it('conceptLanes_chips_zOrder', () => {
    const board = onePagerBoard();
    const swapped = {
      ...board,
      cards: board.cards.map((c) => (c.id === 'resource-c1' ? { ...c, z: 20 } : c)),
    };
    const resources = conceptLanes(swapped).find((lane) => lane.deck === 'resource')!;
    expect(resources.cards.map((c) => c.id)).toEqual(['resource-c2', 'resource-c1']);
  });

  it('conceptLanes_emptyDeck_noLane', () => {
    const lanes = conceptLanes(onePagerBoard());
    expect(lanes.some((lane) => lane.deck === 'goal')).toBe(false);
    expect(conceptLanes(fixtureBoard([]))).toEqual([]);
  });

  it('conceptWidth_absent_default232', () => {
    const board: Partial<Board> = onePagerBoard();
    delete board.conceptWidth;
    expect(conceptWidth(board as Board)).toBe(232);
    expect(conceptWidth({ ...onePagerBoard(), conceptWidth: 400 })).toBe(400);
  });

  it('onePagerCardCount_trainPlusConcept_excludesHookLooseAndOnTop', () => {
    // Train: role-t1 and mechanic-t1. Concept: 4 chips. modifier-1 is loose.
    expect(onePagerCardCount(onePagerBoard())).toBe(6);
    const board = withCards(onePagerBoard(), [
      combinedCard('setting', { id: 'setting-c2', z: 30, inConcept: true }),
      secondModifier({ id: 'top-1', onTopOf: 'setting-c2' }),
    ]);
    expect(onePagerCardCount(board)).toBe(7);
    expect(onePagerCardCount(fixtureBoard([fixtureCard('hook')]))).toBe(0);
  });

  it('titleCaseWords_twoWords_capitalized', () => {
    expect(titleCaseWords('stolen salt')).toBe('Stolen Salt');
    expect(titleCaseWords('tall frozen pilot')).toBe('Tall Frozen Pilot');
  });
});

describe('Concept actions', () => {
  it('enterConcept_rootCard_inConceptTopZ', () => {
    const board = withCards(onePagerBoard(), [
      fixtureCard('goal', { id: 'goal-x', x: 900, y: 900, z: 9 }),
    ]);
    const card = get(enterConcept(board, 'goal-x'), 'goal-x');
    expect(card.inConcept).toBe(true);
    expect(card.tuckedUnder).toBeNull();
    expect(card.z).toBe(10);
  });

  it('enterConcept_trainCard_trainClosesGap', () => {
    // hook → role-t1 → mechanic-t1, and goal-t2 tucked straight under the hook after them.
    const board = withCards(onePagerBoard(), [
      fixtureCard('goal', { id: 'goal-t2', x: 116, y: 96 + 3 * 56, z: 9, tuckedUnder: 'hook-1' }),
    ]);
    const next = enterConcept(board, 'role-t1');
    expect(get(next, 'goal-t2').y).toBe(96 + 56);
    expect(descendantsOf(next, 'hook-1').map((c) => c.id)).toEqual(['goal-t2']);
  });

  it('enterConcept_cardWithTucked_eachBecomesChipInOwnLane', () => {
    const next = enterConcept(onePagerBoard(), 'role-t1');
    expect(get(next, 'role-t1')).toMatchObject({ inConcept: true, tuckedUnder: null });
    expect(get(next, 'mechanic-t1')).toMatchObject({ inConcept: true, tuckedUnder: null });
    expect(get(next, 'role-t1').z).toBeLessThan(get(next, 'mechanic-t1').z);
    const lanes = conceptLanes(next);
    expect(lanes.find((l) => l.deck === 'role')!.cards.map((c) => c.id)).toEqual(['role-t1']);
    expect(lanes.find((l) => l.deck === 'mechanic')!.cards.map((c) => c.id)).toEqual([
      'mechanic-c1',
      'mechanic-t1',
    ]);
  });

  it('enterConcept_onTopModifier_keepsOnTopOf', () => {
    const board = withCards(onePagerBoard(), [
      combinedCard('role', { id: 'role-x', x: 900, y: 900, z: 9 }),
      secondModifier({ id: 'top-1', onTopOf: 'role-x', z: 10 }),
    ]);
    const next = enterConcept(board, 'role-x');
    expect(get(next, 'top-1')).toMatchObject({ onTopOf: 'role-x', inConcept: false });
    expect(cardText(next, get(next, 'role-x'))).toBe('devout exiled navigator');
  });

  it('enterConcept_hook_throws', () => {
    expect(() => enterConcept(onePagerBoard(), 'hook-1')).toThrow();
    expect(() => enterConcept(fixtureBoard([fixtureCard('goal')]), 'goal-1')).toThrow();
  });

  it('leaveConcept_setsPlaceAndClearsFlag', () => {
    const next = leaveConcept(onePagerBoard(), 'resource-c1', { x: 720, y: 480 });
    expect(get(next, 'resource-c1')).toMatchObject({
      inConcept: false,
      x: 720,
      y: 480,
      z: 9,
      tuckedUnder: null,
    });
  });

  it('popOutOfConcept_openSpotBesidePanel_noOverlap', () => {
    const panel = { x: 364, y: 96, width: 232, height: 300 };
    const blocker = { x: 624, y: 96, width: 200, height: 200 };
    const next = popOutOfConcept(onePagerBoard(), 'setting-c1', panel, [blocker]);
    const card = get(next, 'setting-c1');
    expect(card.inConcept).toBe(false);
    for (const rect of [panel, blocker]) {
      const overlaps =
        card.x < rect.x + rect.width &&
        card.x + CARD_SIZE > rect.x &&
        card.y < rect.y + rect.height &&
        card.y + CARD_SIZE > rect.y;
      expect(overlaps).toBe(false);
    }
    expect(card.x).toBeGreaterThanOrEqual(panel.x + panel.width);
    const free = get(popOutOfConcept(onePagerBoard(), 'setting-c1', panel, []), 'setting-c1');
    expect({ x: free.x, y: free.y }).toEqual({ x: 624, y: 96 });
  });

  it('dragOutOfConcept_onCanvas_fullCardAtDrop', () => {
    const next = dragOutOfConcept(
      onePagerBoard(),
      'resource-c1',
      { x: 1000, y: 1000 },
      { x: 900, y: 900 },
    );
    expect(get(next, 'resource-c1')).toMatchObject({
      inConcept: false,
      x: 900,
      y: 900,
      tuckedUnder: null,
    });
  });

  it('dragOutOfConcept_onTrainCard_tucks', () => {
    // The pointer is over role-t1 (116, 152) below the Hook Card's bottom edge.
    const next = dragOutOfConcept(
      onePagerBoard(),
      'resource-c1',
      { x: 200, y: 320 },
      { x: 100, y: 220 },
    );
    expect(get(next, 'resource-c1').inConcept).toBe(false);
    expect(descendantsOf(next, 'hook-1').map((c) => c.id)).toContain('resource-c1');
  });

  it('dragOutOfConcept_snap_onGrid', () => {
    const next = dragOutOfConcept(
      onePagerBoard(),
      'resource-c1',
      { x: 1005, y: 1013 },
      { x: 905, y: 913 },
      { snap: true },
    );
    expect(get(next, 'resource-c1')).toMatchObject({ x: 912, y: 912 });
  });

  it('chipDropAction_modifierOnPlainSetting_combine', () => {
    const board = onePagerBoard();
    expect(chipDropAction(board, get(board, 'modifier-1'), get(board, 'setting-c1'))).toBe(
      'combine',
    );
  });

  it('chipDropAction_modifierOnMechanicChip_null', () => {
    const board = onePagerBoard();
    expect(chipDropAction(board, get(board, 'modifier-1'), get(board, 'mechanic-c1'))).toBeNull();
  });

  it('chipDropAction_nonModifier_null', () => {
    const board = onePagerBoard();
    expect(chipDropAction(board, get(board, 'role-t1'), get(board, 'setting-c1'))).toBeNull();
  });

  it('combineOntoChip_plainChip_mergedRingChipStays', () => {
    const next = combineOntoChip(onePagerBoard(), 'modifier-1', 'setting-c1', { x: 0, y: 0 });
    expect(next.cards.some((c) => c.id === 'modifier-1')).toBe(false);
    const chip = get(next, 'setting-c1');
    expect(chip).toMatchObject({ inConcept: true, tuckedUnder: null });
    expect(chip.rings).toHaveLength(2);
    expect(cardText(next, chip)).toBe('exiled outpost');
  });

  it('combineOntoChip_modifierWithTucked_tuckedEnterConcept', () => {
    const board = withCards(onePagerBoard(), [
      fixtureCard('goal', { id: 'goal-m', x: 96, y: 656, z: 9, tuckedUnder: 'modifier-1' }),
    ]);
    const next = combineOntoChip(board, 'modifier-1', 'setting-c1', { x: 0, y: 0 });
    expect(get(next, 'goal-m')).toMatchObject({ inConcept: true, tuckedUnder: null });
    expect(next.cards.some((c) => c.tuckedUnder === 'setting-c1')).toBe(false);
  });

  it('combineOntoChip_combinedChip_onTop', () => {
    const board = withCards(onePagerBoard(), [
      combinedCard('setting', { id: 'setting-m', z: 9, inConcept: true }),
    ]);
    expect(chipDropAction(board, get(board, 'modifier-1'), get(board, 'setting-m'))).toBe('onTop');
    const next = combineOntoChip(board, 'modifier-1', 'setting-m', { x: 0, y: 0 });
    expect(get(next, 'modifier-1')).toMatchObject({ onTopOf: 'setting-m', inConcept: false });
    expect(get(next, 'setting-m')).toMatchObject({ inConcept: true, tuckedUnder: null });
  });

  it('combineOntoChip_chipWithOnTop_swapReturnsModifierAtDrop', () => {
    const stolen = fixtureCard('modifier', {
      id: 'modifier-s',
      x: 96,
      y: 900,
      z: 11,
      rings: [cue(['stolen', 'salty', 'sunken', 'iron'])],
    });
    const board = withCards(onePagerBoard(), [
      combinedCard('setting', { id: 'setting-m', z: 9, inConcept: true }),
      secondModifier({ id: 'top-1', onTopOf: 'setting-m', z: 10 }),
      stolen,
    ]);
    expect(chipDropAction(board, stolen, get(board, 'setting-m'))).toBe('swap');
    const next = combineOntoChip(board, 'modifier-s', 'setting-m', { x: 700, y: 720 });
    const returned = get(next, 'modifier-s');
    expect(returned).toMatchObject({ x: 700, y: 720, inConcept: false, tuckedUnder: null });
    expect(returned.rings[0]!.cues[0]!.text).toBe('exiled');
    expect(get(next, 'setting-m').rings[1]!.cues[0]!.text).toBe('stolen');
    expect(get(next, 'setting-m')).toMatchObject({ inConcept: true, tuckedUnder: null });
    expect(get(next, 'top-1').onTopOf).toBe('setting-m');
  });

  it('chipResultText_salt_stolenSalt', () => {
    const board: Board = {
      ...fixtureBoard([
        fixtureCard('hook', { id: 'hook-1', x: 96, y: 96 }),
        fixtureCard('resource', {
          id: 'salt',
          z: 2,
          inConcept: true,
          rings: [cue(['salt', 'rope', 'oil', 'coin'])],
        }),
        fixtureCard('modifier', {
          id: 'stolen',
          z: 3,
          modDeck: 'resource',
          rings: [cue(['stolen', 'salty', 'sunken', 'iron'])],
        }),
      ]),
      kind: 'onePager',
    };
    expect(chipResultText(board, 'stolen', 'salt')).toBe('Stolen Salt');
  });

  it('resizeConcept_clamps232And640', () => {
    expect(resizeConcept(onePagerBoard(), 100).conceptWidth).toBe(232);
    expect(resizeConcept(onePagerBoard(), 900).conceptWidth).toBe(640);
    expect(resizeConcept(onePagerBoard(), 400.4).conceptWidth).toBe(400);
  });

  it('resizeConcept_sameWidth_sameBoard', () => {
    const board = onePagerBoard();
    expect(resizeConcept(board, 232)).toBe(board);
    expect(resizeConcept(board, 200)).toBe(board);
  });

  it('conceptDrop_eachDeck_enter', () => {
    const board = onePagerBoard();
    for (const deck of DECKS.filter((d) => d !== 'modifier')) {
      const card = fixtureCard(deck, { id: `${deck}-new`, z: 40 });
      expect(conceptDrop(withCards(board, [card]), card, { panel: true, chipId: null })).toEqual({
        kind: 'enter',
      });
    }
  });

  it('conceptDrop_modifierOffChip_stay', () => {
    const board = onePagerBoard();
    const modifier = get(board, 'modifier-1');
    expect(conceptDrop(board, modifier, { panel: true, chipId: null })).toEqual({ kind: 'stay' });
    expect(conceptDrop(board, modifier, { panel: true, chipId: 'mechanic-c1' })).toEqual({
      kind: 'stay',
    });
    expect(conceptDrop(board, modifier, { panel: true, chipId: 'setting-c1' })).toEqual({
      kind: 'chip',
      chipId: 'setting-c1',
    });
    expect(conceptDrop(board, get(board, 'hook-1'), { panel: true, chipId: null })).toEqual({
      kind: 'stay',
    });
    expect(conceptDrop(board, modifier, { panel: false, chipId: null })).toBeNull();
  });

  it('conceptDrop_freeForm_null', () => {
    const card = fixtureCard('goal');
    expect(conceptDrop(fixtureBoard([card]), card, { panel: true, chipId: null })).toBeNull();
  });

  it('dropCard_concept_enterIsOneChange', () => {
    const board = withCards(onePagerBoard(), [
      fixtureCard('goal', { id: 'goal-x', x: 900, y: 900, z: 9 }),
    ]);
    const next = dropCard(
      board,
      'goal-x',
      { x: 450, y: 150 },
      { x: 350, y: 50 },
      { concept: { panel: true, chipId: null } },
    );
    expect(next).toEqual(enterConcept(board, 'goal-x'));
    // A Hook Card over the panel only moves.
    const moved = dropCard(
      board,
      'hook-1',
      { x: 450, y: 150 },
      { x: 120, y: 120 },
      { concept: { panel: true, chipId: null } },
    );
    expect(get(moved, 'hook-1')).toMatchObject({ x: 120, y: 120 });
  });
});

describe('Concept and the Core Loop card', () => {
  it('enterConcept_loopCard_throws', () => {
    expect(() => enterConcept(onePagerWithLoop(), 'loop-1')).toThrow();
  });

  it('conceptDrop_loop_stay', () => {
    const board = onePagerWithLoop();
    const loop = board.cards.find((card) => card.id === 'loop-1')!;
    expect(conceptDrop(board, loop, { panel: true, chipId: null })).toEqual({ kind: 'stay' });
    expect(conceptDrop(board, loop, { panel: true, chipId: 'resource-c1' })).toEqual({
      kind: 'stay',
    });
  });

  it('conceptLanes_withLoopCard_unchanged', () => {
    expect(conceptLanes(onePagerWithLoop())).toEqual(conceptLanes(onePagerBoard()));
  });

  it('onePagerCardCount_withLoopCard_unchanged', () => {
    expect(onePagerCardCount(onePagerWithLoop())).toBe(onePagerCardCount(onePagerBoard()));
  });
});
