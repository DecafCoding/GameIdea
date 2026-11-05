/**
 * Tests for the board actions, and the Milestone 2 sequence through the board store.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { activeText, iconFor, isCombined } from '@/features/card';
import { cueKey, drawFor } from '@/features/draw';
import { allGenresOn, DECKS, type Board, type Card, type Deck, type Pools } from '@/shared/model';
import { parsePool } from '@/shared/pools';
import { newBoard, useBoardStore } from '@/shared/store';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureStack,
  secondModifier,
  onePagerBoard,
  onePagerWithAnswers,
  onePagerWithLoop,
} from '@/test/fixtures/boards';
import {
  canDeal,
  chooseConnector,
  combineOnto,
  dealSlots,
  dealStack,
  discardCard,
  dropCard,
  duplicateCard,
  lockCard,
  placeHookCard,
  placeNewCard,
  putOnTopOf,
  redrawAll,
  redrawCard,
  resetLoopText,
  setLoopText,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
import { boardRects, CARD_SIZE, HOOK_INSET } from './placement';
import { conceptLanes } from './concept';
import { buildLoopText } from '@/features/loop';
import { cardText, hookSentences, loopSteps, onTopCardOf } from './reading';
import { descendantsOf, isRoot, stackOrder, TUCK_OFFSET } from './stack';

const find = (board: Board, id: string): Card | undefined => board.cards.find((c) => c.id === id);
const get = (board: Board, id: string): Card => find(board, id)!;

/** Every tucked card sits 56 px below the card before it in its stack order. */
function expectStacksConsistent(board: Board) {
  for (const root of board.cards.filter((c) => isRoot(board, c.id))) {
    stackOrder(board, root.id).forEach((card, i) => {
      expect(card.x).toBe(root.x);
      expect(card.y).toBe(root.y + i * TUCK_OFFSET);
    });
  }
}

function overlaps(a: Card, b: Card): boolean {
  return (
    a.x < b.x + CARD_SIZE && a.x + CARD_SIZE > b.x && a.y < b.y + CARD_SIZE && a.y + CARD_SIZE > b.y
  );
}

describe('placeNewCard', () => {
  it('placeNewCard_card_addsRootAtSpotOnTop', () => {
    const board = fixtureBoard([fixtureCard('role', { z: 4 })]);
    const next = placeNewCard(board, fixtureCard('setting', { z: 0 }), { x: 48, y: 72 });
    expect(get(next, 'setting-1')).toMatchObject({ x: 48, y: 72, z: 5, tuckedUnder: null });
  });
});

describe('dropCard', () => {
  it('dropCard_onEmptyCanvas_movesRootWithStack', () => {
    const next = dropCard(
      fixtureBoard(fixtureStack(0, 0)),
      'role-1',
      { x: 900, y: 900 },
      {
        x: 800,
        y: 800,
      },
    );
    expect(get(next, 'conflict-1')).toMatchObject({ x: 800, y: 912 });
  });

  it('dropCard_tuckedOnEmptyCanvas_untucks', () => {
    const next = dropCard(
      fixtureBoard(fixtureStack(0, 0)),
      'conflict-1',
      { x: 900, y: 900 },
      {
        x: 800,
        y: 800,
      },
    );
    expect(get(next, 'conflict-1')).toMatchObject({ tuckedUnder: null, x: 800, y: 800 });
  });

  it('dropCard_onCard_tucks', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 0, y: 0 }),
      fixtureCard('goal', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'goal-1', { x: 100, y: 100 }, { x: 20, y: 20 });
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 0, y: 56 });
  });

  it('dropCard_secondModifierInTopBand_goesOnTop', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 0, y: 0 }),
      secondModifier({ x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'modifier-2', { x: 100, y: 20 }, { x: 20, y: 0 });
    expect(get(next, 'modifier-2')).toMatchObject({ tuckedUnder: null, onTopOf: 'role-1' });
    expect(get(next, 'role-1')).toMatchObject({ tuckedUnder: null, x: 0, y: 0 });
    expect(isCombined(get(next, 'role-1'))).toBe(true);
  });
});

describe('dropCard with snap', () => {
  const snap = { snap: true };

  it('dropCard_moveWithSnap_landsOnGrid', () => {
    const board = fixtureBoard([fixtureCard('goal', { x: 0, y: 0 })]);
    const next = dropCard(board, 'goal-1', { x: 900, y: 900 }, { x: 813, y: 790 }, snap);
    expect(get(next, 'goal-1')).toMatchObject({ x: 816, y: 792 });
  });

  it('dropCard_moveWithoutSnap_staysFree', () => {
    const board = fixtureBoard([fixtureCard('goal', { x: 0, y: 0 })]);
    const next = dropCard(board, 'goal-1', { x: 900, y: 900 }, { x: 813, y: 790 });
    expect(get(next, 'goal-1')).toMatchObject({ x: 813, y: 790 });
    const off = dropCard(board, 'goal-1', { x: 900, y: 900 }, { x: 813, y: 790 }, { snap: false });
    expect(get(off, 'goal-1')).toMatchObject({ x: 813, y: 790 });
  });

  it('dropCard_untuckWithSnap_landsOnGrid', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    const next = dropCard(board, 'conflict-1', { x: 900, y: 900 }, { x: 805, y: 803 }, snap);
    expect(get(next, 'conflict-1')).toMatchObject({ tuckedUnder: null, x: 816, y: 792 });
  });

  it('dropCard_tuckWithSnap_keepsTuckPlace', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 5, y: 7 }),
      fixtureCard('goal', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'goal-1', { x: 100, y: 100 }, { x: 33, y: 41 }, snap);
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 5, y: 63 });
  });

  it('dropCard_combineWithSnap_ignoresSnap', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 5, y: 7 }),
      fixtureCard('modifier', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'modifier-1', { x: 105, y: 157 }, { x: 33, y: 41 }, snap);
    expect(find(next, 'modifier-1')).toBeUndefined();
    expect(isCombined(get(next, 'role-1'))).toBe(true);
    expect(get(next, 'role-1')).toMatchObject({ x: 5, y: 7 });
  });

  it('dropCard_onTopWithSnap_ignoresSnap', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 5, y: 7 }),
      secondModifier({ x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'modifier-2', { x: 105, y: 27 }, { x: 33, y: 13 }, snap);
    expect(get(next, 'modifier-2')).toMatchObject({ onTopOf: 'role-1' });
    expect(get(next, 'role-1')).toMatchObject({ x: 5, y: 7 });
  });

  it('dropCard_rootWithStack_stackMovesByDelta', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    const next = dropCard(board, 'role-1', { x: 900, y: 900 }, { x: 803, y: 811 }, snap);
    expect(get(next, 'role-1')).toMatchObject({ x: 792, y: 816 });
    expect(get(next, 'goal-1')).toMatchObject({ x: 792, y: 872 });
    expect(get(next, 'conflict-1')).toMatchObject({ x: 792, y: 928 });
  });
});

describe('combineOnto', () => {
  it('combineOnto_modifier_absorbsAndDeletesModifier', () => {
    const board = fixtureBoard([
      fixtureCard('role'),
      fixtureCard('modifier', {
        x: 600,
        rings: [
          { cues: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }], activeIndex: 2 },
        ],
      }),
    ]);
    const next = combineOnto(board, 'modifier-1', 'role-1');
    expect(find(next, 'modifier-1')).toBeUndefined();
    expect(isCombined(get(next, 'role-1'))).toBe(true);
    expect(activeText(get(next, 'role-1'))).toBe('c navigator');
  });

  it('combineOnto_tuckedModifier_closesOldStack', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('modifier', { x: 0, y: 177, z: 4, tuckedUnder: 'conflict-1' }),
      fixtureCard('setting', { x: 600, y: 0, z: 5 }),
    ]);
    const next = combineOnto(board, 'modifier-1', 'setting-1');
    expect(stackOrder(next, 'role-1')).toHaveLength(3);
    expect(isCombined(get(next, 'setting-1'))).toBe(true);
    expectStacksConsistent(next);
  });

  it('combineOnto_modifierWithTuckedCards_reTucksThemUnderTarget', () => {
    const board = fixtureBoard([
      fixtureCard('modifier', { x: 0, y: 0, z: 1 }),
      fixtureCard('goal', { x: 0, y: 56, z: 2, tuckedUnder: 'modifier-1' }),
      fixtureCard('role', { x: 600, y: 0, z: 3 }),
    ]);
    const next = combineOnto(board, 'modifier-1', 'role-1');
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 600, y: 56 });
  });
});

describe('swapOnto', () => {
  it('swapOnto_combinedTarget_exchangesActiveCuesAndPlacesModifierBeside', () => {
    const target = combinedCard('role', { x: 0, y: 0, z: 1 });
    target.rings[1] = { ...target.rings[1]!, activeIndex: 1 };
    const second = secondModifier({
      x: 0,
      y: 56,
      z: 2,
      tuckedUnder: 'role-1',
      rings: [
        {
          cues: [{ text: 'devout' }, { text: 'rogue' }, { text: 'cloned' }, { text: 'hollow' }],
          activeIndex: 3,
        },
      ],
    });
    const next = swapOnto(fixtureBoard([target, second]), 'modifier-2', 'role-1');
    const role = get(next, 'role-1');
    const modifier = get(next, 'modifier-2');
    expect(activeText(role)).toBe('hollow navigator');
    expect(activeText(modifier)).toBe('orbital');
    expect(modifier.tuckedUnder).toBeNull();
    expect(overlaps(role, modifier)).toBe(false);
    expect(modifier.z).toBeGreaterThan(role.z);
  });
});

describe('splitCard', () => {
  it('splitCard_combined_restoresModifierAdjectivesAndActiveCue', () => {
    const card = combinedCard('role', { x: 0, y: 0 });
    card.rings[1] = { ...card.rings[1]!, activeIndex: 2 };
    const board = fixtureBoard([card, fixtureCard('goal', { y: 56, z: 2, tuckedUnder: 'role-1' })]);
    const next = splitCard(board, 'role-1', () => 'new-modifier');
    const modifier = get(next, 'new-modifier');
    // A free Modifier's ring has no modDeck; the card carries it.
    expect(modifier.rings).toEqual([{ cues: card.rings[1].cues, activeIndex: 2 }]);
    expect(activeText(modifier)).toBe('clone');
    expect(isCombined(get(next, 'role-1'))).toBe(false);
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', y: 56 });
    expect(overlaps(get(next, 'role-1'), modifier)).toBe(false);
  });
});

describe('duplicateCard', () => {
  const counter = () => {
    let n = 0;
    return () => `copy-${++n}`;
  };

  it('duplicateCard_plainCard_copiesOnlyItselfBesideIt', () => {
    const card = combinedCard('role', { x: 0, y: 0, locked: true });
    card.rings[0] = { ...card.rings[0]!, activeIndex: 2 };
    const board = fixtureBoard([card, fixtureCard('goal', { y: 56, z: 2, tuckedUnder: 'role-1' })]);
    const next = duplicateCard(board, 'role-1', counter());
    expect(next.cards).toHaveLength(3);
    const copy = get(next, 'copy-1');
    expect(copy).toMatchObject({ type: 'role', tuckedUnder: null, locked: true, z: 3 });
    expect(copy.rings).toEqual(card.rings);
    expect(copy.rings[0]).not.toBe(card.rings[0]);
    expect(overlaps(copy, get(next, 'role-1'))).toBe(false);
    expect(overlaps(copy, get(next, 'goal-1'))).toBe(false);
    expect(board.cards).toHaveLength(2);
  });

  it('duplicateCard_cardWithOnTop_copiesOnTopModifier', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 0, y: 0 }),
      secondModifier({ onTopOf: 'role-1', z: 2 }),
    ]);
    const next = duplicateCard(board, 'role-1', counter());
    expect(get(next, 'copy-2')).toMatchObject({ type: 'modifier', onTopOf: 'copy-1' });
    expect(cardText(next, get(next, 'copy-1'))).toBe(cardText(board, get(board, 'role-1')));
  });

  it('duplicateCard_hookCard_copiesWholeStackInOrder', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      fixtureCard('role', { x: 20, y: 56, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { x: 20, y: 112, z: 3, tuckedUnder: 'role-1', connector: 'so' }),
    ]);
    const next = duplicateCard(board, 'hook-1', counter());
    expect(next.cards).toHaveLength(6);
    const hook = get(next, 'copy-1');
    expect(hook.type).toBe('hook');
    expect(stackOrder(next, 'copy-1').map((c) => c.type)).toEqual(['hook', 'role', 'goal']);
    expect(get(next, 'copy-3')).toMatchObject({ tuckedUnder: 'copy-2', connector: 'so' });
    // The copy keeps the stack's layout, clear of the original stack.
    expect(get(next, 'copy-2')).toMatchObject({ x: hook.x + 20, y: hook.y + 56 });
    expect(hook.x).toBeGreaterThanOrEqual(240 + 24);
    expect(get(next, 'copy-3').z).toBeGreaterThan(get(next, 'copy-2').z);
  });
});

describe('modDeck through combine, swap and Split', () => {
  it('splitCard_newModifier_takesRingModDeck', () => {
    const card = combinedCard('role');
    card.rings[1] = { ...card.rings[1]!, modDeck: 'setting' };
    const next = splitCard(fixtureBoard([card]), 'role-1', () => 'new-modifier');
    expect(get(next, 'new-modifier').modDeck).toBe('setting');
  });

  it('splitCard_newModifierRing_hasNoModDeck', () => {
    const next = splitCard(fixtureBoard([combinedCard('role')]), 'role-1', () => 'new-modifier');
    expect(get(next, 'new-modifier').rings[0]!.modDeck).toBeUndefined();
    expect(get(next, 'new-modifier')).toMatchObject({ locked: false, onTopOf: null });
  });

  it('combineThenSplit_iconSurvives', () => {
    const resourceMod = fixtureCard('modifier', { x: 600, modDeck: 'resource', z: 2 });
    const board = fixtureBoard([fixtureCard('resource'), resourceMod]);
    const combined = combineOnto(board, 'modifier-1', 'resource-1');
    expect(get(combined, 'resource-1').rings[1]!.modDeck).toBe('resource');
    const next = splitCard(combined, 'resource-1', () => 'back');
    expect(iconFor(get(next, 'back'))).toBe('battery-plus');
  });

  it('swapOnto_exchangesModDecks', () => {
    const base = combinedCard('role');
    const incoming = secondModifier({ x: 600, z: 2, modDeck: 'setting' });
    const next = swapOnto(fixtureBoard([base, incoming]), 'modifier-2', 'role-1');
    expect(get(next, 'role-1').rings[1]!.modDeck).toBe('setting');
    expect(get(next, 'modifier-2').modDeck).toBe('role');
    expect(get(next, 'modifier-2').rings[0]!.modDeck).toBeUndefined();
  });
});

describe('On Top', () => {
  const merged = () => combinedCard('role', { x: 0, y: 0 });

  it('putOnTopOf_mergedBase_linksAndRetucksChildren', () => {
    const board = fixtureBoard([
      merged(),
      secondModifier({ x: 600, y: 0, z: 2 }),
      fixtureCard('goal', { x: 600, y: 56, z: 3, tuckedUnder: 'modifier-2' }),
    ]);
    const next = putOnTopOf(board, 'modifier-2', 'role-1');
    expect(get(next, 'modifier-2')).toMatchObject({ onTopOf: 'role-1', tuckedUnder: null });
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 0, y: 56 });
    expect(onTopCardOf(next, 'role-1')?.id).toBe('modifier-2');
  });

  it('putOnTopOf_secondOnTop_throws', () => {
    const board = fixtureBoard([
      merged(),
      secondModifier({ onTopOf: 'role-1' }),
      fixtureCard('modifier', { id: 'modifier-3', x: 600 }),
    ]);
    expect(() => putOnTopOf(board, 'modifier-3', 'role-1')).toThrow(/already/);
  });

  it('putOnTopOf_unmergedBase_throws', () => {
    const board = fixtureBoard([fixtureCard('role'), secondModifier({ x: 600 })]);
    expect(() => putOnTopOf(board, 'modifier-2', 'role-1')).toThrow(/merged/);
  });

  it('splitCard_onlyOnTop_releasesIt', () => {
    const board = fixtureBoard([fixtureCard('role'), secondModifier({ onTopOf: 'role-1' })]);
    const next = splitCard(board, 'role-1');
    const released = get(next, 'modifier-2');
    expect(released.onTopOf).toBeNull();
    expect(overlaps(released, get(next, 'role-1'))).toBe(false);
    expect(next.cards).toHaveLength(2);
  });

  it('splitCard_mergedWithOnTop_splitsMergedAndKeepsOnTop', () => {
    const board = fixtureBoard([merged(), secondModifier({ onTopOf: 'role-1' })]);
    const next = splitCard(board, 'role-1', () => 'split');
    expect(get(next, 'modifier-2').onTopOf).toBe('role-1');
    expect(isCombined(get(next, 'role-1'))).toBe(false);
    expect(get(next, 'split').type).toBe('modifier');
  });

  it('discardCard_baseWithOnTop_freesIt', () => {
    const board = fixtureBoard([merged(), secondModifier({ x: 900, y: 900, onTopOf: 'role-1' })]);
    const next = discardCard(board, 'role-1');
    expect(get(next, 'modifier-2')).toMatchObject({ onTopOf: null, x: 0, y: 0 });
    expect(find(next, 'role-1')).toBeUndefined();
  });

  it('redrawCard_base_keepsOnTop', () => {
    const board = fixtureBoard([merged(), secondModifier({ onTopOf: 'role-1' })]);
    const next = redrawCard(board, 'role-1', fixtureCard('role', { id: 'drawn' }));
    expect(get(next, 'modifier-2')).toBe(get(board, 'modifier-2'));
  });

  it('moveCard_base_onTopStaysLinked', () => {
    const board = fixtureBoard([merged(), secondModifier({ onTopOf: 'role-1' })]);
    const next = dropCard(board, 'role-1', { x: 900, y: 900 }, { x: 480, y: 480 });
    expect(get(next, 'role-1')).toMatchObject({ x: 480, y: 480 });
    expect(get(next, 'modifier-2').onTopOf).toBe('role-1');
    expect(cardText(next, get(next, 'role-1'))).toBe('devout exiled navigator');
  });
});

describe('redrawCard', () => {
  it('redrawCard_combined_keepsIdPlaceTucksAndAdjectives', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 48, y: 48 }),
      fixtureCard('goal', { x: 48, y: 104, z: 2, tuckedUnder: 'role-1' }),
    ]);
    const drawn = fixtureCard('role', {
      id: 'drawn',
      rings: [
        { cues: [{ text: 'w' }, { text: 'x' }, { text: 'y' }, { text: 'z' }], activeIndex: 0 },
      ],
    });
    const adjectives = get(board, 'role-1').rings[1];
    const next = redrawCard(board, 'role-1', drawn);
    expect(get(next, 'role-1')).toMatchObject({
      x: 48,
      y: 48,
      z: 1,
      rings: [drawn.rings[0], adjectives],
    });
    expect(get(next, 'goal-1').tuckedUnder).toBe('role-1');
  });

  it('redrawCard_otherType_throws', () => {
    const board = fixtureBoard([fixtureCard('role')]);
    expect(() => redrawCard(board, 'role-1', fixtureCard('setting'))).toThrow();
  });

  it('redrawCard_lockedCard_staysLocked', () => {
    const board = fixtureBoard([fixtureCard('role', { locked: true, connector: 'with a' })]);
    const next = redrawCard(board, 'role-1', fixtureCard('role', { id: 'drawn' }));
    expect(get(next, 'role-1')).toMatchObject({ locked: true, connector: 'with a', onTopOf: null });
  });

  it('redrawCard_differentModDeck_throws', () => {
    const board = fixtureBoard([fixtureCard('modifier', { modDeck: 'setting' })]);
    const drawn = fixtureCard('modifier', { id: 'drawn', modDeck: 'role' });
    expect(() => redrawCard(board, 'modifier-1', drawn)).toThrow();
    const same = fixtureCard('modifier', { id: 'drawn', modDeck: 'setting' });
    expect(get(redrawCard(board, 'modifier-1', same), 'modifier-1').modDeck).toBe('setting');
  });
});

describe('Hook Card', () => {
  it('placeHookCard_addsRootHook', () => {
    const board = fixtureBoard([fixtureCard('role', { z: 4 })]);
    const next = placeHookCard(board, 'hook-new', { x: 480, y: 48 });
    expect(get(next, 'hook-new')).toEqual({
      id: 'hook-new',
      type: 'hook',
      x: 480,
      y: 48,
      z: 5,
      tuckedUnder: null,
      rings: [],
      onTopOf: null,
      locked: false,
      inConcept: false,
    });
  });

  it('dropCard_hookOnCard_movesNotTucks', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 0, y: 0 }),
      fixtureCard('hook', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'hook-1', { x: 100, y: 100 }, { x: 20, y: 20 });
    expect(get(next, 'hook-1')).toMatchObject({ tuckedUnder: null, x: 20, y: 20 });
  });

  it('dropCard_roleOnHook_tucksInset20', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      fixtureCard('role', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'role-1', { x: 100, y: 100 }, { x: 20, y: 20 });
    expect(get(next, 'role-1')).toMatchObject({ tuckedUnder: 'hook-1', x: 20, y: 56 });
  });
});

describe('redrawAll', () => {
  /** A Hook Card stack: Hook, combined Player Role (with an On Top card), Goal, Conflict. */
  function hookBoard(): Board {
    return fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      combinedCard('role', { x: 20, y: 56, z: 2, tuckedUnder: 'hook-1', connector: 'You play a' }),
      fixtureCard('goal', { x: 20, y: 112, z: 3, tuckedUnder: 'role-1', connector: 'until' }),
      fixtureCard('conflict', { x: 20, y: 168, z: 4, tuckedUnder: 'goal-1', locked: true }),
      secondModifier({ onTopOf: 'role-1' }),
    ]);
  }
  const fresh = (card: Card): Card => ({
    ...card,
    rings: [{ cues: card.rings[0]!.cues.map((c) => ({ text: `new ${c.text}` })), activeIndex: 0 }],
  });

  it('redrawAll_conceptCards_unchanged', () => {
    const board = onePagerBoard();
    const { board: next } = redrawAll(board, 'hook-1', fresh);
    for (const card of board.cards.filter((c) => c.inConcept)) {
      expect(next.cards.find((c) => c.id === card.id)).toBe(card);
    }
    expect(next.cards.find((c) => c.id === 'role-t1')!.rings[0]!.cues[0]!.text).toBe(
      'new navigator',
    );
  });

  it('redrawAll_skipsLockedCards', () => {
    const board = hookBoard();
    const { board: next, redrawn } = redrawAll(board, 'hook-1', fresh);
    expect(redrawn).toEqual(['role-1', 'goal-1']);
    expect(get(next, 'conflict-1')).toBe(get(board, 'conflict-1'));
  });

  it('redrawAll_keepsTucksPlacesAndConnectors', () => {
    const board = hookBoard();
    const { board: next } = redrawAll(board, 'hook-1', fresh);
    for (const id of ['role-1', 'goal-1']) {
      const { rings: _before, ...rest } = get(board, id);
      const { rings: after, ...restAfter } = get(next, id);
      void _before;
      expect(restAfter).toEqual(rest);
      expect(after[0]!.cues[0]!.text).toMatch(/^new /);
    }
  });

  it('redrawAll_combinedCard_keepsAdjectiveRing', () => {
    const board = hookBoard();
    const { board: next } = redrawAll(board, 'hook-1', fresh);
    expect(get(next, 'role-1').rings[1]).toEqual(get(board, 'role-1').rings[1]);
  });

  it('redrawAll_keepsOnTopCard', () => {
    const board = hookBoard();
    const { board: next } = redrawAll(board, 'hook-1', fresh);
    expect(get(next, 'modifier-2')).toBe(get(board, 'modifier-2'));
  });

  it('redrawAll_everyCardLocked_returnsSameBoard', () => {
    // The Conflict is already locked; lock the other 2 stack cards.
    const locked = lockCard(lockCard(hookBoard(), 'role-1'), 'goal-1');
    expect(redrawAll(locked, 'hook-1', fresh)).toEqual({ board: locked, redrawn: [] });
    expect(redrawAll(locked, 'hook-1', fresh).board).toBe(locked);
  });
});

describe('lockCard', () => {
  it('lockCard_keepsEverythingElse', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 48, y: 48, connector: 'with a' }),
      fixtureCard('goal', { x: 48, y: 104, z: 2, tuckedUnder: 'role-1' }),
    ]);
    const next = lockCard(board, 'role-1');
    expect(get(next, 'role-1')).toEqual({ ...get(board, 'role-1'), locked: true });
    expect(get(next, 'goal-1')).toBe(get(board, 'goal-1'));
    expect(get(lockCard(next, 'role-1'), 'role-1').locked).toBe(false);
  });
});

describe('discardCard', () => {
  it('discardCard_rootWithChildren_reRootsChildren', () => {
    const next = discardCard(fixtureBoard(fixtureStack(0, 0)), 'role-1');
    expect(find(next, 'role-1')).toBeUndefined();
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: null, y: 56 });
    expectStacksConsistent(next);
  });

  it('discardCard_lastCard_removesOnlyIt', () => {
    const next = discardCard(fixtureBoard(fixtureStack(0, 0)), 'conflict-1');
    expect(next.cards.map((c) => c.id)).toEqual(['role-1', 'goal-1']);
  });
});

describe('turnCardOnBoard', () => {
  it('turnCardOnBoard_cw_turnsOnlyThatCard', () => {
    const board = fixtureBoard([fixtureCard('role'), fixtureCard('setting', { x: 600 })]);
    const next = turnCardOnBoard(board, 'role-1', 'outer', 'cw');
    expect(activeText(get(next, 'role-1'))).toBe('captain');
    expect(get(next, 'setting-1')).toBe(get(board, 'setting-1'));
  });
});

describe('Milestone 2 sequence', () => {
  beforeEach(() => {
    useBoardStore.getState().openBoard(newBoard());
  });

  it('boardActions_drawTuckCombineSwapSplit_sequenceKeepsStacksConsistent', () => {
    const { changeBoard } = useBoardStore.getState();
    const board = () => useBoardStore.getState().board;
    const half = CARD_SIZE / 2;
    const center = (id: string) => ({ x: get(board(), id).x + half, y: get(board(), id).y + half });
    const at = (id: string) => ({ x: get(board(), id).x, y: get(board(), id).y });

    // Draw a Player Role, Goal, Conflict and 2 Modifiers in open spots.
    const drawn = [
      fixtureCard('role'),
      fixtureCard('goal'),
      fixtureCard('conflict'),
      fixtureCard('modifier'),
      secondModifier(),
    ];
    drawn.forEach((card, i) => {
      changeBoard((b) => placeNewCard(b, card, { x: i * 480, y: 0 }));
      expectStacksConsistent(board());
    });
    expect(boardRects(board())).toHaveLength(5);

    const steps: [string, () => void][] = [
      [
        'tuck goal',
        () => changeBoard((b) => dropCard(b, 'goal-1', center('role-1'), at('goal-1'))),
      ],
      [
        'tuck conflict',
        () => changeBoard((b) => dropCard(b, 'conflict-1', center('goal-1'), at('conflict-1'))),
      ],
      [
        'combine',
        () =>
          changeBoard((b) =>
            dropCard(
              b,
              'modifier-1',
              { x: at('role-1').x + 10, y: at('role-1').y + 10 },
              at('modifier-1'),
            ),
          ),
      ],
      [
        'swap',
        () => changeBoard((b) => dropCard(b, 'modifier-2', center('role-1'), at('modifier-2'))),
      ],
      ['split', () => changeBoard((b) => splitCard(b, 'role-1'))],
      ['discard goal', () => changeBoard((b) => discardCard(b, 'goal-1'))],
    ];
    for (const [, step] of steps) {
      step();
      expectStacksConsistent(board());
    }

    const b = board();
    expect(find(b, 'modifier-1')).toBeUndefined();
    expect(get(b, 'modifier-2').rings[0]!.cues[0]!.text).toBe('exiled');
    expect(isCombined(get(b, 'role-1'))).toBe(false);
    expect(b.cards.filter((c) => c.type === 'modifier')).toHaveLength(2);
    expect(get(b, 'conflict-1')).toMatchObject({
      tuckedUnder: 'role-1',
      y: get(b, 'role-1').y + 56,
    });
  });
});

describe('chooseConnector', () => {
  it('chooseConnector_word_savedOnCard', () => {
    const board = fixtureBoard([
      fixtureCard('role'),
      fixtureCard('goal', { y: 56, z: 2, tuckedUnder: 'role-1' }),
    ]);
    const next = chooseConnector(board, 'goal-1', 'refuses to');
    expect(get(next, 'goal-1').connector).toBe('refuses to');
    expect(get(board, 'goal-1').connector).toBeUndefined();
  });

  it('chooseConnector_sameWord_sameBoard', () => {
    const board = fixtureBoard([fixtureCard('goal', { connector: 'must' })]);
    expect(chooseConnector(board, 'goal-1', 'must')).toBe(board);
  });
});

describe('dealStack', () => {
  /** A fake draw: distinct cue texts per call, and a record of every excluded set. */
  function fakeDraw() {
    let n = 0;
    const calls: { deck: Deck; excluded: string[] }[] = [];
    const draw = (deck: Deck, excluded: ReadonlySet<string>): Card => {
      n += 1;
      calls.push({ deck, excluded: [...excluded].sort() });
      const count = ['goal', 'conflict', 'twist', 'progression', 'constraint'].includes(deck)
        ? 2
        : 4;
      return fixtureCard(deck, {
        id: `dealt-${n}`,
        z: 0,
        rings: [
          {
            cues: Array.from({ length: count }, (_, i) => ({ text: `${deck} ${n}.${i}` })),
            activeIndex: 0,
          },
        ],
      });
    };
    return { draw, calls };
  }

  /** Every train card sits 20 px in from the Hook Card, 56 px below the card before it. */
  function expectTrainConsistent(board: Board) {
    const root = get(board, 'hook-1');
    stackOrder(board, 'hook-1').forEach((card, i) => {
      expect(card.x).toBe(i === 0 ? root.x : root.x + HOOK_INSET);
      expect(card.y).toBe(root.y + i * TUCK_OFFSET);
    });
  }

  const hook = (overrides: Partial<Card> = {}) =>
    fixtureCard('hook', { id: 'hook-1', x: 96, y: 96, z: 1, ...overrides });
  const train = (board: Board) => descendantsOf(board, 'hook-1');
  const trainTypes = (board: Board) => train(board).map((c) => c.type);
  const onePager = (cards: Card[]): Board => ({ ...fixtureBoard(cards), kind: 'onePager' });

  it('dealStack_emptyFreeFormHook_dealsCoreFiveInOrder', () => {
    const { draw } = fakeDraw();
    const { board, dealt } = dealStack(fixtureBoard([hook()]), 'hook-1', draw);
    expect(trainTypes(board)).toEqual(['role', 'mechanic', 'resource', 'goal', 'conflict']);
    expect(dealt).toEqual(train(board).map((c) => c.id));
    expect(board.cards.some((c) => c.inConcept)).toBe(false);
    expectTrainConsistent(board);
  });

  it('dealStack_emptyOnePagerHook_dealsFiveAndFourteenChips', () => {
    const { draw } = fakeDraw();
    const { board, dealt } = dealStack(onePager([hook()]), 'hook-1', draw);
    expect(trainTypes(board)).toEqual(['role', 'mechanic', 'resource', 'goal', 'conflict']);
    const lanes = conceptLanes(board);
    expect(lanes.map((l) => l.deck)).toEqual([
      'role',
      'resource',
      'setting',
      'mood',
      'twist',
      'progression',
      'constraint',
    ]);
    for (const lane of lanes) {
      expect(lane.cards).toHaveLength(2);
      for (const card of lane.cards)
        expect(card).toMatchObject({ inConcept: true, tuckedUnder: null });
    }
    expect(dealt).toHaveLength(19);
    expect(dealt).toEqual([
      ...train(board).map((c) => c.id),
      ...lanes.flatMap((l) => l.cards.map((c) => c.id)),
    ]);
    expectTrainConsistent(board);
  });

  it('dealStack_partialTrain_insertsInCoreOrder', () => {
    const { draw } = fakeDraw();
    const start = fixtureBoard([
      hook(),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { z: 3, tuckedUnder: 'role-1' }),
    ]);
    const { board } = dealStack(start, 'hook-1', draw);
    expect(trainTypes(board)).toEqual(['role', 'mechanic', 'resource', 'goal', 'conflict']);
    expect(train(board)[0]!.id).toBe('role-1');
    expect(train(board)[3]!.id).toBe('goal-1');
    expect(get(board, 'role-1').rings).toEqual(get(start, 'role-1').rings);
    expectTrainConsistent(board);
  });

  const CORE: Deck[] = ['role', 'mechanic', 'resource', 'goal', 'conflict'];
  const mixes: Deck[][] = [
    ...CORE.map((missing) => CORE.filter((d) => d !== missing)),
    ['conflict'],
    ['role'],
    ['role', 'conflict'],
  ];
  it.each(mixes.map((m) => [m.join('+'), m] as const))(
    'dealStack_mix_%s_fillsToCoreOrder',
    (_name, present) => {
      const cards: Card[] = [hook()];
      let parent = 'hook-1';
      present.forEach((deck, i) => {
        cards.push(fixtureCard(deck, { z: i + 2, tuckedUnder: parent }));
        parent = `${deck}-1`;
      });
      const { board, dealt } = dealStack(fixtureBoard(cards), 'hook-1', fakeDraw().draw);
      expect(trainTypes(board)).toEqual(CORE);
      expect(dealt).toHaveLength(5 - present.length);
      for (const deck of present) expect(train(board).some((c) => c.id === `${deck}-1`)).toBe(true);
      expectTrainConsistent(board);
    },
  );

  it('dealStack_nonCoreCardInTrain_keptAndOrderPreserved', () => {
    const start = fixtureBoard([
      hook(),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('twist', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { z: 4, tuckedUnder: 'twist-1' }),
    ]);
    const { board } = dealStack(start, 'hook-1', fakeDraw().draw);
    const order = train(board).map((c) => c.id);
    for (const id of ['role-1', 'twist-1', 'goal-1']) expect(order).toContain(id);
    const kept = order.filter((id) => ['role-1', 'twist-1', 'goal-1'].includes(id));
    expect(kept).toEqual(['role-1', 'twist-1', 'goal-1']);
    expect(train(board)).toHaveLength(6);
    expectTrainConsistent(board);
  });

  it('dealStack_tuckedModifier_staysWithItsCard', () => {
    const start = fixtureBoard([
      hook(),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('modifier', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { z: 4, tuckedUnder: 'role-1' }),
    ]);
    const { board } = dealStack(start, 'hook-1', fakeDraw().draw);
    expect(get(board, 'modifier-1').tuckedUnder).toBe('role-1');
    expect(train(board).map((c) => c.type)).toEqual([
      'role',
      'modifier',
      'mechanic',
      'resource',
      'goal',
      'conflict',
    ]);
  });

  it('dealStack_branchedTrain_newCardFollowsPredecessorBranch', () => {
    const start = fixtureBoard([
      hook(),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('twist', { z: 4, tuckedUnder: 'role-1' }),
    ]);
    const { board } = dealStack(start, 'hook-1', fakeDraw().draw);
    const ids = train(board).map((c) => c.id);
    expect(ids.indexOf('goal-1')).toBeLessThan(ids.indexOf('twist-1'));
    expect(trainTypes(board).filter((t) => CORE.includes(t as Deck))).toEqual(CORE);
    expect(train(board)).toHaveLength(6);
    expectTrainConsistent(board);
  });

  it('dealStack_presenceCountsAnyDepthOnly', () => {
    const deep = fixtureBoard([
      hook(),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('twist', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { z: 4, tuckedUnder: 'twist-1' }),
    ]);
    expect(dealSlots(deep, 'hook-1').base).toEqual(['mechanic', 'resource', 'conflict']);
    const outside = onePager([
      hook(),
      fixtureCard('goal', { id: 'loose-goal', x: 900, z: 2 }),
      combinedCard('role', { z: 3, tuckedUnder: 'hook-1' }),
      fixtureCard('modifier', { z: 4, onTopOf: 'role-1' }),
      fixtureCard('mechanic', { id: 'chip-m', z: 5, inConcept: true }),
    ]);
    expect(dealSlots(outside, 'hook-1').base).toEqual(['mechanic', 'resource', 'goal', 'conflict']);
  });

  it('dealStack_laneWithOneChip_getsOne', () => {
    const { board } = dealStack(onePagerBoard(), 'hook-1', fakeDraw().draw);
    const setting = conceptLanes(board).find((l) => l.deck === 'setting')!;
    expect(setting.cards).toHaveLength(2);
    expect(setting.cards[0]!.id).toBe('setting-c1');
  });

  it('dealStack_laneWithThreeChips_getsNone', () => {
    const start = onePagerBoard();
    expect(dealSlots(start, 'hook-1').details.filter((d) => d === 'resource')).toEqual([]);
    const three: Board = {
      ...start,
      cards: [...start.cards, fixtureCard('mood', { id: 'mood-a', z: 20, inConcept: true })],
    };
    const more: Board = {
      ...three,
      cards: [
        ...three.cards,
        fixtureCard('mood', { id: 'mood-b', z: 21, inConcept: true }),
        fixtureCard('mood', { id: 'mood-c', z: 22, inConcept: true }),
      ],
    };
    expect(dealSlots(more, 'hook-1').details).not.toContain('mood');
    const { board } = dealStack(start, 'hook-1', fakeDraw().draw);
    const resource = conceptLanes(board).find((l) => l.deck === 'resource')!;
    expect(resource.cards.map((c) => c.id)).toEqual(['resource-c1', 'resource-c2']);
    const mechanic = conceptLanes(board).find((l) => l.deck === 'mechanic')!;
    expect(mechanic.cards).toHaveLength(1);
  });

  it('dealStack_fullStack_returnsSameBoard', () => {
    const { board: full } = dealStack(fixtureBoard([hook()]), 'hook-1', fakeDraw().draw);
    const again = dealStack(full, 'hook-1', fakeDraw().draw);
    expect(again.board).toBe(full);
    expect(again.dealt).toEqual([]);
  });

  it('canDeal_fullStack_false', () => {
    const { board: full } = dealStack(onePager([hook()]), 'hook-1', fakeDraw().draw);
    expect(canDeal(full, 'hook-1')).toBe(false);
  });

  it('canDeal_emptyHook_true', () => {
    expect(canDeal(fixtureBoard([hook()]), 'hook-1')).toBe(true);
    expect(canDeal(onePager([hook()]), 'hook-1')).toBe(true);
  });

  it('canDeal_freeFormFullTrain_falseEvenWithNoChips', () => {
    const { board: full } = dealStack(fixtureBoard([hook()]), 'hook-1', fakeDraw().draw);
    expect(full.kind).toBe('free');
    expect(canDeal(full, 'hook-1')).toBe(false);
  });

  it('dealStack_excluded_holdsBoardCuesAndEarlierDealCues', () => {
    const loose = fixtureCard('role', {
      id: 'loose-role',
      x: 900,
      z: 2,
      rings: [{ cues: [{ text: '  Pilot ' }, { text: 'Medic' }], activeIndex: 0 }],
    });
    const { draw, calls } = fakeDraw();
    dealStack(onePager([hook(), loose]), 'hook-1', draw);
    const roles = calls.filter((c) => c.deck === 'role');
    expect(roles).toHaveLength(3);
    expect(roles[0]!.excluded).toEqual(['medic', 'pilot']);
    // The 1st Details Player Role sees the train Player Role's cues (dealt-1).
    expect(roles[1]!.excluded).toEqual(
      ['medic', 'pilot', ...[0, 1, 2, 3].map((i) => cueKey(`role 1.${i}`))].sort(),
    );
    // The 2nd chip of the lane sees the 1st chip's cues.
    const firstChip = calls.indexOf(roles[1]!) + 1;
    for (let i = 0; i < 4; i++) expect(roles[2]!.excluded).toContain(`role ${firstChip}.${i}`);
  });

  it('dealStack_hookIdNotHook_throws', () => {
    const board = fixtureBoard([hook(), fixtureCard('role', { x: 900 })]);
    expect(() => dealStack(board, 'role-1', fakeDraw().draw)).toThrow(/Hook Card/);
  });

  it('dealStack_doesNotMutateInput', () => {
    const board = onePagerBoard();
    const before = JSON.stringify(board);
    dealStack(board, 'hook-1', fakeDraw().draw);
    expect(JSON.stringify(board)).toBe(before);
  });

  it('dealStack_realPoolsOnePager_fullDistinctDeal', () => {
    const pools = Object.fromEntries(
      DECKS.map((deck) => {
        const file = join(process.cwd(), 'public', 'pools', `${deck}.json`);
        return [deck, parsePool(deck, JSON.parse(readFileSync(file, 'utf8')))];
      }),
    ) as unknown as Pools;
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let run = 0; run < 10; run++) {
      const { board, dealt } = dealStack(onePager([hook()]), 'hook-1', (deck, excluded) =>
        drawFor({ type: deck }, pools, allGenresOn(), { excluded, random }),
      );
      expect(dealt).toHaveLength(19);
      for (const deck of DECKS) {
        const keys = board.cards
          .filter((c) => c.type === deck)
          .flatMap((c) => c.rings[0]!.cues.map((cue) => cueKey(cue.text)));
        expect(new Set(keys).size).toBe(keys.length);
      }
      const [sentence] = hookSentences(board);
      expect(sentence).toBeTruthy();
      expect(sentence).not.toMatch(/ {2}/);
      for (const card of train(board)) expect(sentence).toContain(cardText(board, card));
    }
  });
});

describe('Core Loop card drops', () => {
  it('dropCard_loopOnHookCard_movesAndNeverTucks', () => {
    const board = onePagerWithLoop();
    const next = dropCard(board, 'loop-1', { x: 150, y: 120 }, { x: 101, y: 107 }, { snap: true });
    expect(get(next, 'loop-1')).toMatchObject({ tuckedUnder: null, x: 96, y: 96 });
    expect(descendantsOf(next, 'hook-1')).toEqual(descendantsOf(board, 'hook-1'));
  });

  it('dropCard_cardOnLoop_movesNotTucks', () => {
    const base = onePagerWithLoop();
    const board: Board = {
      ...base,
      cards: [...base.cards, fixtureCard('goal', { id: 'goal-x', x: 2000, y: 2000, z: 10 })],
    };
    const next = dropCard(board, 'goal-x', { x: 700, y: 150 }, { x: 690, y: 120 });
    expect(get(next, 'goal-x')).toMatchObject({ tuckedUnder: null, x: 690, y: 120 });
    expect(get(next, 'loop-1')).toEqual(get(board, 'loop-1'));
  });

  it('dropCard_loopOverPanel_staysWhereReleased', () => {
    const next = dropCard(
      onePagerWithLoop(),
      'loop-1',
      { x: 450, y: 150 },
      { x: 400, y: 300 },
      { concept: { panel: true, chipId: null } },
    );
    expect(get(next, 'loop-1')).toMatchObject({ x: 400, y: 300, inConcept: false });
  });
});

describe('loop text', () => {
  const loopOf = (board: Board) => get(board, 'loop-1');
  const withText = (text: string): Board => {
    const board = onePagerWithLoop();
    return {
      ...board,
      cards: board.cards.map((c) => (c.id === 'loop-1' ? { ...c, loopText: text } : c)),
    };
  };
  /** A fake deal draw: distinct cue texts per call. */
  const dealDraw = () => {
    let n = 0;
    return (deck: Deck): Card => {
      n += 1;
      const count = ['goal', 'conflict', 'twist', 'progression', 'constraint'].includes(deck)
        ? 2
        : 4;
      return fixtureCard(deck, {
        id: `dealt-${n}`,
        z: 0,
        rings: [
          {
            cues: Array.from({ length: count }, (_, i) => ({ text: `${deck} ${n}.${i}` })),
            activeIndex: 0,
          },
        ],
      });
    };
  };
  const fresh = (card: Card): Card => ({
    ...card,
    rings: [{ cues: card.rings[0]!.cues.map((c) => ({ text: `new ${c.text}` })), activeIndex: 0 }],
  });

  it('setLoopText_newText_stored', () => {
    const next = setLoopText(onePagerWithLoop(), 'loop-1', 'summon → earn clues');
    expect(loopOf(next).loopText).toBe('summon → earn clues');
  });

  it('setLoopText_sameAsShownLive_sameBoard', () => {
    const board = onePagerWithLoop();
    const live = buildLoopText(loopSteps(board)).text;
    expect(live).toBe('trade → earn memories');
    expect(setLoopText(board, 'loop-1', live)).toBe(board);
  });

  it('setLoopText_sameAsStored_sameBoard', () => {
    const board = withText('my loop');
    expect(setLoopText(board, 'loop-1', 'my loop')).toBe(board);
  });

  it('setLoopText_emptyOrSpaces_removesKey', () => {
    for (const text of ['', '   ', '\n\t ']) {
      const next = setLoopText(withText('my loop'), 'loop-1', text);
      expect('loopText' in loopOf(next)).toBe(false);
    }
  });

  it('setLoopText_emptyWithNoStoredText_sameBoard', () => {
    const board = onePagerWithLoop();
    expect(setLoopText(board, 'loop-1', '  ')).toBe(board);
  });

  it('setLoopText_keepsTextExactly', () => {
    const text = '  dig deeper  \n  sell the ore \n';
    expect(loopOf(setLoopText(onePagerWithLoop(), 'loop-1', text)).loopText).toBe(text);
  });

  it('resetLoopText_removesKey', () => {
    const next = resetLoopText(withText('my loop'), 'loop-1');
    expect('loopText' in loopOf(next)).toBe(false);
  });

  it('resetLoopText_noStoredText_sameBoard', () => {
    const board = onePagerWithLoop();
    expect(resetLoopText(board, 'loop-1')).toBe(board);
  });

  it('setLoopText_notLoopCard_throws', () => {
    expect(() => setLoopText(onePagerWithLoop(), 'hook-1', 'my loop')).toThrow(/Core Loop/);
    expect(() => resetLoopText(onePagerWithLoop(), 'role-t1')).toThrow(/Core Loop/);
  });

  it('redrawAll_and_dealStack_keepLoopText', () => {
    const board = withText('my loop');
    const redrawn = redrawAll(board, 'hook-1', fresh).board;
    expect(redrawn).not.toBe(board);
    expect(loopOf(redrawn)).toEqual(loopOf(board));
    const dealt = dealStack(board, 'hook-1', dealDraw()).board;
    expect(dealt).not.toBe(board);
    expect(loopOf(dealt)).toEqual(loopOf(board));
  });

  it('turnCardOnBoard_keepsLoopText', () => {
    const board = withText('my loop');
    const next = turnCardOnBoard(board, 'mechanic-t1', 'outer', 'cw');
    expect(loopOf(next)).toEqual(loopOf(board));
  });

  it('loop_dealEditRedraw_keepsUserText', () => {
    const start = newBoard({ kind: 'onePager', hookId: 'hook-1', loopId: 'loop-1' });
    const dealt = dealStack(start, 'hook-1', dealDraw()).board;
    const live = buildLoopText(loopSteps(dealt)).text;
    expect(buildLoopText(loopSteps(dealt)).parts.map((p) => p.deck)).toEqual([
      'mechanic',
      'resource',
      'progression',
      'goal',
    ]);
    const edited = setLoopText(dealt, 'loop-1', 'dig → sell → dig deeper');
    const redrawn = redrawAll(edited, 'hook-1', fresh).board;
    const mechanic = descendantsOf(redrawn, 'hook-1').find((c) => c.type === 'mechanic')!;
    const turned = turnCardOnBoard(redrawn, mechanic.id, 'outer', 'cw');
    expect(loopOf(turned).loopText).toBe('dig → sell → dig deeper');
    expect(buildLoopText(loopSteps(turned)).text).not.toBe(live);
  });

  it('setLoopText_doesNotMutateInput', () => {
    const board = withText('my loop');
    const before = JSON.stringify(board);
    setLoopText(board, 'loop-1', 'another loop');
    setLoopText(board, 'loop-1', '');
    resetLoopText(board, 'loop-1');
    expect(JSON.stringify(board)).toBe(before);
  });
});

describe('answers survive other board actions', () => {
  const fresh = (card: Card): Card => ({
    ...card,
    rings: card.rings.map((ring) => ({
      ...ring,
      cues: ring.cues.map((c) => ({ text: `new ${c.text}` })),
    })),
  });
  /** A fake deal draw: distinct cue texts per call. */
  const dealDraw = () => {
    let n = 0;
    return (deck: Deck): Card => {
      n += 1;
      const count = ['goal', 'conflict', 'twist', 'progression', 'constraint'].includes(deck)
        ? 2
        : 4;
      return fixtureCard(deck, {
        id: `dealt-${n}`,
        z: 0,
        rings: [
          {
            cues: Array.from({ length: count }, (_, i) => ({ text: `${deck} ${n}.${i}` })),
            activeIndex: 0,
          },
        ],
      });
    };
  };

  it('redrawAll_onePagerWithAnswers_keepsQuestions', () => {
    const board = onePagerWithAnswers();
    const { board: next } = redrawAll(board, 'hook-1', fresh);
    expect(next).not.toBe(board);
    expect(next.questions).toBe(board.questions);
  });

  it('dealStack_onePagerWithAnswers_keepsQuestions', () => {
    const board = onePagerWithAnswers();
    const { board: next } = dealStack(board, 'hook-1', dealDraw());
    expect(next).not.toBe(board);
    expect(next.questions).toBe(board.questions);
  });

  it('setLoopText_onePagerWithAnswers_keepsQuestions', () => {
    const board = onePagerWithAnswers();
    const next = setLoopText(board, 'loop-1', 'my own loop');
    expect(next).not.toBe(board);
    expect(next.questions).toBe(board.questions);
  });
});
