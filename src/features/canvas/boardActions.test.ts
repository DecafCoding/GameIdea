/**
 * Tests for the board actions, and the Milestone 2 sequence through the board store.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { activeText, iconFor, isCombined } from '@/features/card';
import type { Board, Card } from '@/shared/model';
import { newBoard, useBoardStore } from '@/shared/store';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureStack,
  secondModifier,
} from '@/test/fixtures/boards';
import {
  chooseConnector,
  combineOnto,
  discardCard,
  dropCard,
  lockCard,
  placeHookCard,
  placeNewCard,
  putOnTopOf,
  redrawAll,
  redrawCard,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
import { boardRects, CARD_SIZE } from './placement';
import { cardText, onTopCardOf } from './reading';
import { isRoot, stackOrder, TUCK_OFFSET } from './stack';

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
