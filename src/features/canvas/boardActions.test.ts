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
  secondDescription,
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
    const board = fixtureBoard([fixtureCard('character', { z: 4 })]);
    const next = placeNewCard(board, fixtureCard('setting', { z: 0 }), { x: 48, y: 72 });
    expect(get(next, 'setting-1')).toMatchObject({ x: 48, y: 72, z: 5, tuckedUnder: null });
  });
});

describe('dropCard', () => {
  it('dropCard_onEmptyCanvas_movesRootWithStack', () => {
    const next = dropCard(
      fixtureBoard(fixtureStack(0, 0)),
      'character-1',
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
      fixtureCard('character', { x: 0, y: 0 }),
      fixtureCard('motivation', { x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'motivation-1', { x: 100, y: 100 }, { x: 20, y: 20 });
    expect(get(next, 'motivation-1')).toMatchObject({ tuckedUnder: 'character-1', x: 0, y: 59 });
  });

  it('dropCard_secondDescriptionOnCombinedEdge_goesOnTop', () => {
    const board = fixtureBoard([
      combinedCard('character', { x: 0, y: 0 }),
      secondDescription({ x: 600, y: 0, z: 2 }),
    ]);
    const next = dropCard(board, 'description-2', { x: 125, y: 220 }, { x: 20, y: 150 });
    expect(get(next, 'description-2')).toMatchObject({ tuckedUnder: null, x: 0, y: 0 });
    expect(get(next, 'character-1')).toMatchObject({ tuckedUnder: 'description-2', y: 59 });
    expect(isCombined(get(next, 'character-1'))).toBe(true);
  });
});

describe('combineOnto', () => {
  it('combineOnto_description_absorbsAndDeletesDescription', () => {
    const board = fixtureBoard([
      fixtureCard('character'),
      fixtureCard('description', {
        x: 600,
        rings: [
          { cues: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }], activeIndex: 2 },
        ],
      }),
    ]);
    const next = combineOnto(board, 'description-1', 'character-1');
    expect(find(next, 'description-1')).toBeUndefined();
    expect(isCombined(get(next, 'character-1'))).toBe(true);
    expect(activeText(get(next, 'character-1'))).toBe('c navigator');
  });

  it('combineOnto_tuckedDescription_closesOldStack', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('description', { x: 0, y: 177, z: 4, tuckedUnder: 'conflict-1' }),
      fixtureCard('setting', { x: 600, y: 0, z: 5 }),
    ]);
    const next = combineOnto(board, 'description-1', 'setting-1');
    expect(stackOrder(next, 'character-1')).toHaveLength(3);
    expect(isCombined(get(next, 'setting-1'))).toBe(true);
    expectStacksConsistent(next);
  });

  it('combineOnto_descriptionWithTuckedCards_reTucksThemUnderTarget', () => {
    const board = fixtureBoard([
      fixtureCard('description', { x: 0, y: 0, z: 1 }),
      fixtureCard('motivation', { x: 0, y: 59, z: 2, tuckedUnder: 'description-1' }),
      fixtureCard('character', { x: 600, y: 0, z: 3 }),
    ]);
    const next = combineOnto(board, 'description-1', 'character-1');
    expect(get(next, 'motivation-1')).toMatchObject({ tuckedUnder: 'character-1', x: 600, y: 59 });
  });
});

describe('swapOnto', () => {
  it('swapOnto_combinedTarget_exchangesActiveCuesAndPlacesDescriptionBeside', () => {
    const target = combinedCard('character', { x: 0, y: 0, z: 1 });
    target.rings[1] = { ...target.rings[1]!, activeIndex: 1 };
    const second = secondDescription({
      x: 0,
      y: 59,
      z: 2,
      tuckedUnder: 'character-1',
      rings: [
        {
          cues: [{ text: 'devout' }, { text: 'rogue' }, { text: 'cloned' }, { text: 'hollow' }],
          activeIndex: 3,
        },
      ],
    });
    const next = swapOnto(fixtureBoard([target, second]), 'description-2', 'character-1');
    const character = get(next, 'character-1');
    const description = get(next, 'description-2');
    expect(activeText(character)).toBe('hollow navigator');
    expect(activeText(description)).toBe('orbital');
    expect(description.tuckedUnder).toBeNull();
    expect(overlaps(character, description)).toBe(false);
    expect(description.z).toBeGreaterThan(character.z);
  });
});

describe('splitCard', () => {
  it('splitCard_combined_restoresDescriptionAdjectivesAndActiveCue', () => {
    const card = combinedCard('character', { x: 0, y: 0 });
    card.rings[1] = { ...card.rings[1]!, activeIndex: 2 };
    const board = fixtureBoard([
      card,
      fixtureCard('motivation', { y: 59, z: 2, tuckedUnder: 'character-1' }),
    ]);
    const next = splitCard(board, 'character-1', () => 'new-description');
    const description = get(next, 'new-description');
    expect(description.rings).toEqual([card.rings[1]]);
    expect(activeText(description)).toBe('clone');
    expect(isCombined(get(next, 'character-1'))).toBe(false);
    expect(get(next, 'motivation-1')).toMatchObject({ tuckedUnder: 'character-1', y: 59 });
    expect(overlaps(get(next, 'character-1'), description)).toBe(false);
  });
});

describe('redrawCard', () => {
  it('redrawCard_combined_keepsIdPlaceTucksAndAdjectives', () => {
    const board = fixtureBoard([
      combinedCard('character', { x: 48, y: 48 }),
      fixtureCard('motivation', { x: 48, y: 104, z: 2, tuckedUnder: 'character-1' }),
    ]);
    const drawn = fixtureCard('character', {
      id: 'drawn',
      rings: [
        { cues: [{ text: 'w' }, { text: 'x' }, { text: 'y' }, { text: 'z' }], activeIndex: 0 },
      ],
    });
    const adjectives = get(board, 'character-1').rings[1];
    const next = redrawCard(board, 'character-1', drawn);
    expect(get(next, 'character-1')).toMatchObject({
      x: 48,
      y: 48,
      z: 1,
      rings: [drawn.rings[0], adjectives],
    });
    expect(get(next, 'motivation-1').tuckedUnder).toBe('character-1');
  });

  it('redrawCard_otherType_throws', () => {
    const board = fixtureBoard([fixtureCard('character')]);
    expect(() => redrawCard(board, 'character-1', fixtureCard('setting'))).toThrow();
  });
});

describe('discardCard', () => {
  it('discardCard_rootWithChildren_reRootsChildren', () => {
    const next = discardCard(fixtureBoard(fixtureStack(0, 0)), 'character-1');
    expect(find(next, 'character-1')).toBeUndefined();
    expect(get(next, 'motivation-1')).toMatchObject({ tuckedUnder: null, y: 59 });
    expectStacksConsistent(next);
  });

  it('discardCard_lastCard_removesOnlyIt', () => {
    const next = discardCard(fixtureBoard(fixtureStack(0, 0)), 'conflict-1');
    expect(next.cards.map((c) => c.id)).toEqual(['character-1', 'motivation-1']);
  });
});

describe('turnCardOnBoard', () => {
  it('turnCardOnBoard_cw_turnsOnlyThatCard', () => {
    const board = fixtureBoard([fixtureCard('character'), fixtureCard('setting', { x: 600 })]);
    const next = turnCardOnBoard(board, 'character-1', 'outer', 'cw');
    expect(activeText(get(next, 'character-1'))).toBe('captain');
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

    // Draw a Character, Motivation, Conflict and 2 Descriptions in open spots.
    const drawn = [
      fixtureCard('character'),
      fixtureCard('motivation'),
      fixtureCard('conflict'),
      fixtureCard('description'),
      secondDescription(),
    ];
    drawn.forEach((card, i) => {
      changeBoard((b) => placeNewCard(b, card, { x: i * 480, y: 0 }));
      expectStacksConsistent(board());
    });
    expect(boardRects(board())).toHaveLength(5);

    const steps: [string, () => void][] = [
      [
        'tuck motivation',
        () =>
          changeBoard((b) =>
            dropCard(b, 'motivation-1', center('character-1'), at('motivation-1')),
          ),
      ],
      [
        'tuck conflict',
        () =>
          changeBoard((b) => dropCard(b, 'conflict-1', center('motivation-1'), at('conflict-1'))),
      ],
      [
        'combine',
        () =>
          changeBoard((b) =>
            dropCard(
              b,
              'description-1',
              { x: at('character-1').x + 10, y: at('character-1').y + 10 },
              at('description-1'),
            ),
          ),
      ],
      [
        'swap',
        () =>
          changeBoard((b) =>
            dropCard(b, 'description-2', center('character-1'), at('description-2')),
          ),
      ],
      ['split', () => changeBoard((b) => splitCard(b, 'character-1'))],
      ['discard motivation', () => changeBoard((b) => discardCard(b, 'motivation-1'))],
    ];
    for (const [, step] of steps) {
      step();
      expectStacksConsistent(board());
    }

    const b = board();
    expect(find(b, 'description-1')).toBeUndefined();
    expect(get(b, 'description-2').rings[0]!.cues[0]!.text).toBe('exiled');
    expect(isCombined(get(b, 'character-1'))).toBe(false);
    expect(b.cards.filter((c) => c.type === 'description')).toHaveLength(2);
    expect(get(b, 'conflict-1')).toMatchObject({
      tuckedUnder: 'character-1',
      y: get(b, 'character-1').y + 59,
    });
  });
});

describe('chooseConnector', () => {
  it('chooseConnector_word_savedOnCard', () => {
    const board = fixtureBoard([
      fixtureCard('character'),
      fixtureCard('motivation', { y: 59, z: 2, tuckedUnder: 'character-1' }),
    ]);
    const next = chooseConnector(board, 'motivation-1', 'refuses to');
    expect(get(next, 'motivation-1').connector).toBe('refuses to');
    expect(get(board, 'motivation-1').connector).toBeUndefined();
  });

  it('chooseConnector_sameWord_sameBoard', () => {
    const board = fixtureBoard([fixtureCard('motivation', { connector: 'must' })]);
    expect(chooseConnector(board, 'motivation-1', 'must')).toBe(board);
  });
});
