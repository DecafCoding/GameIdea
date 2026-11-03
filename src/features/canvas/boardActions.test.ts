/**
 * Tests for the board actions, and the Milestone 2 sequence through the board store.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { activeText, isCombined } from '@/features/card';
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
  placeNewCard,
  redrawCard,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
import { boardRects, CARD_SIZE } from './placement';
import { isRoot, stackOrder, TUCK_OFFSET } from './stack';

const find = (board: Board, id: string): Card | undefined => board.cards.find((c) => c.id === id);
const get = (board: Board, id: string): Card => find(board, id)!;

/** Every tucked card sits 59 px below the card before it in its stack order. */
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
    expect(get(next, 'conflict-1')).toMatchObject({ x: 800, y: 918 });
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
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 0, y: 59 });
  });

  it('dropCard_secondModifierOnCombinedEdge_goesOnTop', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 0, y: 0 }),
      secondModifier({ x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'modifier-2', { x: 125, y: 220 }, { x: 20, y: 150 });
    expect(get(next, 'modifier-2')).toMatchObject({ tuckedUnder: null, x: 0, y: 0 });
    expect(get(next, 'role-1')).toMatchObject({ tuckedUnder: 'modifier-2', y: 59 });
    expect(isCombined(get(next, 'role-1'))).toBe(true);
  });
});

describe('combineOnto', () => {
  it('combineOnto_description_absorbsAndDeletesModifier', () => {
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

  it('combineOnto_descriptionWithTuckedCards_reTucksThemUnderTarget', () => {
    const board = fixtureBoard([
      fixtureCard('modifier', { x: 0, y: 0, z: 1 }),
      fixtureCard('goal', { x: 0, y: 59, z: 2, tuckedUnder: 'modifier-1' }),
      fixtureCard('role', { x: 600, y: 0, z: 3 }),
    ]);
    const next = combineOnto(board, 'modifier-1', 'role-1');
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', x: 600, y: 59 });
  });
});

describe('swapOnto', () => {
  it('swapOnto_combinedTarget_exchangesActiveCuesAndPlacesModifierBeside', () => {
    const target = combinedCard('role', { x: 0, y: 0, z: 1 });
    target.rings[1] = { ...target.rings[1]!, activeIndex: 1 };
    const second = secondModifier({
      x: 0,
      y: 59,
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
    const board = fixtureBoard([card, fixtureCard('goal', { y: 59, z: 2, tuckedUnder: 'role-1' })]);
    const next = splitCard(board, 'role-1', () => 'new-modifier');
    const modifier = get(next, 'new-modifier');
    expect(modifier.rings).toEqual([card.rings[1]]);
    expect(activeText(modifier)).toBe('clone');
    expect(isCombined(get(next, 'role-1'))).toBe(false);
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: 'role-1', y: 59 });
    expect(overlaps(get(next, 'role-1'), modifier)).toBe(false);
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
});

describe('discardCard', () => {
  it('discardCard_rootWithChildren_reRootsChildren', () => {
    const next = discardCard(fixtureBoard(fixtureStack(0, 0)), 'role-1');
    expect(find(next, 'role-1')).toBeUndefined();
    expect(get(next, 'goal-1')).toMatchObject({ tuckedUnder: null, y: 59 });
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
      y: get(b, 'role-1').y + 59,
    });
  });
});

describe('chooseConnector', () => {
  it('chooseConnector_word_savedOnCard', () => {
    const board = fixtureBoard([
      fixtureCard('role'),
      fixtureCard('goal', { y: 59, z: 2, tuckedUnder: 'role-1' }),
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
