/**
 * Browser tests for One-Pager boards (docs/feature-one-pager-board.html, design 9.15):
 * New Board makes either kind, a One-Pager board starts with its 1 Hook Card, and its
 * Hook Card menu and rail stop a second Hook Card. The Concept panel sits beside the Hook
 * Card and moves with it; drops route into deck lanes or onto chips; chips pop out, drag
 * out and drag back in; the panel resizes; each action is 1 undo step. The footer, the
 * board list label and the text file show the One-Pager parts. A version 1 database and a
 * version 1 board file open as Free Form boards, and a bad One-Pager file is refused.
 */
import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card } from '@/shared/model';
import { fixtureCard, onePagerBoard, version1BoardFile } from '@/test/fixtures/boards';
import {
  boxOf,
  canvasCards,
  cardById,
  dragTo,
  drawFromRail,
  openBoard,
  rail,
  storedBoards,
} from './board-helpers';
import { exportFile } from './export-helpers';
import { backgroundRgb, type DeckName } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');
const hookMenu = (page: Page) => page.getByTestId('hook-menu');
const panel = (page: Page) => page.getByTestId('concept-panel');
const nodeBox = (page: Page, id: string) =>
  boxOf(page.locator(`.react-flow__node[data-id="${id}"]`));
const chip = (page: Page, id: string) =>
  page.locator(`[data-testid="concept-chip"][data-card-id="${id}"]`);
const lane = (page: Page, name: string) => panel(page).getByRole('list', { name });
const laneTexts = (page: Page, name: string) =>
  lane(page, name).getByTestId('chip').allTextContents();
const sentence = (page: Page) => page.getByTestId('hook-sentence');

/** The stored One-Pager board (the only board in the test profile). */
async function stored(page: Page, id = 'one-pager'): Promise<Board> {
  return (await storedBoards(page)).find((b) => b.id === id)!;
}

async function storedCard(
  page: Page,
  id: string,
  boardId = 'one-pager',
): Promise<Card | undefined> {
  return (await stored(page, boardId)).cards.find((c) => c.id === id);
}

/** The middle of a locator's box. */
async function centerOf(locator: Locator) {
  const box = await boxOf(locator);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A point inside the panel, below its last lane and clear of every chip. */
/** Clicks the Details title, which highlights the panel and shows its resize edges. */
async function highlightDetails(page: Page) {
  await panel(page).getByRole('heading', { name: 'Details' }).click();
  await expect(panel(page)).toHaveAttribute('data-highlighted', '');
}

async function emptyPanelPoint(page: Page) {
  const box = await boxOf(panel(page));
  return { x: box.x + box.width - 20, y: box.y + 14 };
}

/** Presses on a chip and moves to the point with stepped moves; releases unless told not to. */
async function dragChip(page: Page, id: string, to: { x: number; y: number }, release = true) {
  const from = await centerOf(chip(page, id));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  if (release) await page.mouse.up();
}

/** The One-Pager fixture plus extra cards. */
function onePagerWith(extra: Card[]): Board {
  const board = onePagerBoard();
  return { ...board, cards: [...board.cards, ...extra] };
}

test.describe('board kind', () => {
  test('onePager_newBoard_opensWithItsHookCard', async ({ page }) => {
    await openBoard(page, undefined, 'One-Pager');
    await expect(canvasCards(page)).toHaveCount(1);
    await expect(hookCard(page)).toHaveCount(1);
    await expect(panel(page)).toBeVisible();
    await expect
      .poll(async () => (await storedBoards(page)).map((b) => [b.kind, b.conceptWidth]))
      .toEqual([['onePager', 232]]);
    const [board] = await storedBoards(page);
    expect(board!.cards.filter((card) => card.type === 'hook')).toHaveLength(1);
  });

  test('onePager_newBoardDefault_isFreeForm', async ({ page }) => {
    await openBoard(page);
    await expect(page.getByTestId('start-here')).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    await expect.poll(async () => (await storedBoards(page)).map((b) => b.kind)).toEqual(['free']);
  });

  test('onePager_hookMenu_copyDealAndRedrawOnly', async ({ page }) => {
    await openBoard(page, undefined, 'One-Pager');
    await hookCard(page).hover({ position: { x: 120, y: 40 } });
    await expect(hookMenu(page)).toBeVisible();
    await expect(hookMenu(page).getByRole('button', { name: 'Copy Hook' })).toBeVisible();
    await expect(hookMenu(page).getByRole('button', { name: 'Deal Stack' })).toBeVisible();
    await expect(hookMenu(page).getByRole('button', { name: 'Redraw All' })).toBeVisible();
    await expect(hookMenu(page).getByRole('button', { name: 'Duplicate' })).toHaveCount(0);
    await expect(hookMenu(page).getByRole('button', { name: 'Discard' })).toHaveCount(0);
  });

  test('onePager_railHookButton_disabled', async ({ page }) => {
    await openBoard(page, undefined, 'One-Pager');
    await expect(rail(page).getByRole('button', { name: 'Draw A Hook Card' })).toBeDisabled();
  });
});

test.describe('panel', () => {
  test('onePager_panel_besideHookCard', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const hook = await nodeBox(page, 'hook-1');
    const box = await nodeBox(page, 'concept-panel');
    expect(Math.abs(box.x - (hook.x + 268))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - hook.y)).toBeLessThanOrEqual(1);
    expect(Math.round((await boxOf(panel(page))).width)).toBe(232);
  });

  test('onePager_moveHookCard_panelStays', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const hook = await nodeBox(page, 'hook-1');
    const before = await nodeBox(page, 'concept-panel');
    await page.mouse.move(hook.x + 120, hook.y + 30);
    await page.mouse.down();
    await page.mouse.move(hook.x + 168, hook.y + 102, { steps: 6 });
    // The panel moves on its own (user 2026-11-05): it stays put while the Hook Card moves.
    const during = await nodeBox(page, 'concept-panel');
    expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(during.y - before.y)).toBeLessThanOrEqual(1);
    await page.mouse.up();
    await expect.poll(async () => (await storedCard(page, 'hook-1'))?.x).not.toBe(96);
    const after = await nodeBox(page, 'concept-panel');
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test('onePager_dragPanel_movesAloneAndSavesOnce', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const hookBefore = await nodeBox(page, 'hook-1');
    const before = await nodeBox(page, 'concept-panel');
    // Grab the header, away from the chips and the resize handle.
    await page.mouse.move(before.x + 150, before.y + 26);
    await page.mouse.down();
    await page.mouse.move(before.x + 150 + 144, before.y + 26 + 240, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await stored(page)).conceptPos).toBeDefined();
    const pos = (await stored(page)).conceptPos!;
    // Snap is on by default: the drop lands on the 24 px grid.
    expect(pos.x % 24).toBe(0);
    expect(pos.y % 24).toBe(0);
    expect(Math.abs(pos.x - (364 + 144))).toBeLessThanOrEqual(12);
    expect(Math.abs(pos.y - (96 + 240))).toBeLessThanOrEqual(12);
    const hookAfter = await nodeBox(page, 'hook-1');
    expect(hookAfter.x).toBeCloseTo(hookBefore.x, 0);
    expect(hookAfter.y).toBeCloseTo(hookBefore.y, 0);
    // The chips came along with the panel.
    await expect(panel(page).getByTestId('chip')).toHaveCount(4);
    // 1 undo step puts it back beside the Hook Card.
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await stored(page)).conceptPos).toBeUndefined();
  });

  test('onePager_lanes_railOrderAndChipText', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await expect(panel(page).getByRole('heading', { level: 3 })).toHaveText([
      'Mechanics',
      'Resources',
      'Settings',
    ]);
    expect(await laneTexts(page, 'Resources')).toEqual(['memories', 'rope']);
    expect(await laneTexts(page, 'Mechanics')).toEqual(['climb']);
    await expect(page.getByTestId('concept-panel').getByTestId('chip')).toHaveCount(4);
  });

  test.describe('light mode', () => {
    test.use({ settings: { mode: 'light' } });

    test('onePager_lightMode_panelUsesSurface', async ({ page }) => {
      await openBoard(page, onePagerBoard());
      expect(await backgroundRgb(panel(page))).toEqual([255, 255, 255]);
    });
  });

  test('onePager_drawWithViewCenteredOnPanel_cardLandsOffPanel', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const canvas = await boxOf(page.getByTestId('canvas'));
    const center = await centerOf(panel(page));
    // A copy of the board whose saved view puts the panel's center at the view center. The
    // page reloads so the test seam saves it (a hash change alone does not restart the app).
    const centeredBoard: Board = {
      ...onePagerBoard(),
      id: 'one-pager-centered',
      view: {
        panX: Math.round(canvas.x + canvas.width / 2 - center.x),
        panY: Math.round(canvas.y + canvas.height / 2 - center.y),
        zoom: 1,
      },
    };
    await page.addInitScript((b) => {
      window.__GAMEIDEA_E2E_BOARD__ = b;
    }, centeredBoard);
    await page.goto('/#/board/one-pager-centered');
    await page.reload();
    // The hash change above can send the not-yet-saved board to the list before the reload
    // runs; after the reload the board is saved, so open it again.
    await page.goto('/#/board/one-pager-centered');
    await expect(panel(page)).toBeVisible();
    await expect(rail(page).getByRole('button', { name: 'Draw A Goal' })).toBeEnabled();
    const centered = await centerOf(panel(page));
    expect(Math.abs(centered.x - (canvas.x + canvas.width / 2))).toBeLessThanOrEqual(2);
    await drawFromRail(page, 'Goal');
    const goal = page.locator('.react-flow__node [data-card][data-type="goal"]');
    await expect(goal).toHaveCount(1);
    const card = await boxOf(goal);
    const box = await boxOf(panel(page));
    const overlaps =
      card.x < box.x + box.width &&
      card.x + card.width > box.x &&
      card.y < box.y + box.height &&
      card.y + card.height > box.y;
    expect(overlaps).toBe(false);
  });
});

test.describe('drops', () => {
  const DECKS: [DeckName, string][] = [
    ['Player Role', 'Player Roles'],
    ['Mechanic', 'Mechanics'],
    ['Resource', 'Resources'],
    ['Goal', 'Goals'],
    ['Conflict', 'Conflicts'],
    ['Setting', 'Settings'],
    ['Mood', 'Mood'],
    ['Twist', 'Twist'],
    ['Progression', 'Progression'],
    ['Constraint', 'Constraints'],
  ];

  test('onePager_dropEachDeck_goesToItsLane', async ({ page }) => {
    await openBoard(page, undefined, 'One-Pager');
    for (const [deck, laneName] of DECKS) {
      await drawFromRail(page, deck);
      // The newest card: the only card node besides the Hook Card.
      const card = page.locator('.react-flow__node [data-card]:not([data-type="hook"])');
      await expect(card).toHaveCount(1);
      await dragTo(page, card, await emptyPanelPoint(page));
      await expect(card).toHaveCount(0);
      await expect(lane(page, laneName).getByTestId('chip')).toHaveCount(1);
    }
    await expect(page.getByTestId('concept-panel').getByTestId('chip')).toHaveCount(10);
    await expect
      .poll(async () => {
        const [board] = await storedBoards(page);
        return board!.cards.filter((c) => c.inConcept && c.tuckedUnder === null).length;
      })
      .toBe(10);
  });

  test('onePager_dragOverPanel_laneAndSlotShow', async ({ page }) => {
    await openBoard(
      page,
      onePagerWith([fixtureCard('goal', { id: 'goal-x', x: 720, y: 600, z: 9 })]),
    );
    await dragTo(page, cardById(page, 'goal-x'), await emptyPanelPoint(page), undefined, false);
    await expect(page.getByTestId('concept-slot')).toHaveText('Goal goes here');
    await expect(lane(page, 'Goals')).toBeVisible();
    await expect(page.getByTestId('hint-slot')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByTestId('concept-slot')).toHaveCount(0);
    await expect(lane(page, 'Goals').getByTestId('chip')).toHaveText(['keep the light on']);
  });

  test('onePager_dropTrainCardIntoPanel_trainClosesGap', async ({ page }) => {
    const goal = fixtureCard('goal', {
      id: 'goal-t2',
      x: 116,
      y: 96 + 3 * 56,
      z: 9,
      tuckedUnder: 'hook-1',
    });
    await openBoard(page, onePagerWith([goal]));
    const before = await boxOf(cardById(page, 'goal-t2'));
    await dragTo(page, cardById(page, 'role-t1'), await emptyPanelPoint(page), { x: 150, y: 172 });
    await expect(chip(page, 'role-t1')).toBeVisible();
    await expect(chip(page, 'mechanic-t1')).toBeVisible();
    await expect
      .poll(async () => (await boxOf(cardById(page, 'goal-t2'))).y)
      .toBeCloseTo(before.y - 112, 0);
    await expect.poll(async () => (await storedCard(page, 'role-t1'))?.inConcept).toBe(true);
    await expect(sentence(page)).not.toContainText('navigator');
  });

  test('onePager_modifierOverSettingChip_outlineAndResultTag', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await dragTo(
      page,
      cardById(page, 'modifier-1'),
      await centerOf(chip(page, 'setting-c1')),
      undefined,
      false,
    );
    await expect(page.getByTestId('chip-result')).toHaveText('Exiled Outpost');
    await expect(chip(page, 'setting-c1').getByTestId('chip')).toHaveAttribute(
      'data-targeted',
      'true',
    );
    await expect(page.getByTestId('concept-slot')).toHaveCount(0);
    await page.mouse.up();
  });

  test('onePager_modifierOnChip_combines', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await dragTo(page, cardById(page, 'modifier-1'), await centerOf(chip(page, 'setting-c1')));
    await expect(chip(page, 'setting-c1')).toHaveText('exiled outpost');
    await expect(cardById(page, 'modifier-1')).toHaveCount(0);
    await expect.poll(async () => (await storedCard(page, 'modifier-1')) === undefined).toBe(true);
  });

  test('onePager_modifierOffChip_staysOnCanvas', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await dragTo(page, cardById(page, 'modifier-1'), await centerOf(chip(page, 'mechanic-c1')));
    await expect(cardById(page, 'modifier-1')).toHaveCount(1);
    await expect(chip(page, 'mechanic-c1')).toHaveText('climb');
    await expect
      .poll(async () => {
        const card = await storedCard(page, 'modifier-1');
        return card ? [card.inConcept, card.x !== 720] : null;
      })
      .toEqual([false, true]);
  });

  test('onePager_noteOnPanel_noHint', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const note = page.getByTestId('note');
    await dragTo(page, note, await emptyPanelPoint(page), { x: 40, y: 12 }, false);
    await expect(page.getByTestId('concept-slot')).toHaveCount(0);
    await expect(page.getByTestId('chip-result')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByTestId('concept-panel').getByTestId('chip')).toHaveCount(4);
  });

  test('onePager_eachDrop_oneUndoStep', async ({ page }) => {
    await openBoard(
      page,
      onePagerWith([fixtureCard('goal', { id: 'goal-x', x: 720, y: 600, z: 9 })]),
    );
    await dragTo(page, cardById(page, 'goal-x'), await emptyPanelPoint(page));
    await expect(chip(page, 'goal-x')).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(chip(page, 'goal-x')).toHaveCount(0);
    await expect(cardById(page, 'goal-x')).toBeVisible();
    await expect.poll(async () => (await storedCard(page, 'goal-x'))?.inConcept).toBe(false);
    // Into the train and back: the drop out of the train is 1 step too.
    await dragTo(page, cardById(page, 'mechanic-t1'), await emptyPanelPoint(page), {
      x: 150,
      y: 172,
    });
    await expect(chip(page, 'mechanic-t1')).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(cardById(page, 'mechanic-t1')).toBeVisible();
    await expect(sentence(page)).toContainText('trade');
  });

  test('onePager_redrawAll_conceptUnchanged', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const chips = await panel(page).getByTestId('chip').allTextContents();
    await hookCard(page).hover({ position: { x: 120, y: 40 } });
    await hookMenu(page).getByRole('button', { name: 'Redraw All' }).click();
    await expect
      .poll(async () => (await storedCard(page, 'role-t1'))?.rings[0]?.cues[0]?.text)
      .not.toBe('navigator');
    expect(await panel(page).getByTestId('chip').allTextContents()).toEqual(chips);
    const board = await stored(page);
    for (const card of onePagerBoard().cards.filter((c) => c.inConcept)) {
      expect(board.cards.find((c) => c.id === card.id)!.rings).toEqual(card.rings);
    }
  });
});

test.describe('chip actions', () => {
  test('onePager_doubleClickChip_popsOutBesidePanel', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const zoom = page.getByRole('button', { name: 'Reset Zoom' });
    await expect(zoom).toHaveText('100%');
    await chip(page, 'resource-c1').dblclick();
    await expect(cardById(page, 'resource-c1')).toBeVisible();
    await expect(chip(page, 'resource-c1')).toHaveCount(0);
    await expect(zoom).toHaveText('100%');
    const card = await boxOf(cardById(page, 'resource-c1'));
    const box = await boxOf(panel(page));
    expect(card.x).toBeGreaterThanOrEqual(box.x + box.width);
    await expect.poll(async () => (await storedCard(page, 'resource-c1'))?.inConcept).toBe(false);
  });

  test('onePager_dragChipToCanvas_fullCardAtDrop', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const canvas = await boxOf(page.getByTestId('canvas'));
    const to = { x: canvas.x + 380, y: canvas.y + 560 };
    await dragChip(page, 'resource-c2', to, false);
    await expect(page.getByTestId('chip-ghost')).toBeVisible();
    await page.mouse.up();
    await expect(page.getByTestId('chip-ghost')).toHaveCount(0);
    const card = await boxOf(cardById(page, 'resource-c2'));
    // Snap is on: the centered card lands within half a grid step of the pointer.
    expect(Math.abs(card.x + 100 - to.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(card.y + 100 - to.y)).toBeLessThanOrEqual(12);
    await expect(chip(page, 'resource-c2')).toHaveCount(0);
  });

  test('onePager_dragChipOntoTrain_tucks', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    // The pointer on the mechanic's visible band, below the card above it.
    const mechanic = await boxOf(cardById(page, 'mechanic-t1'));
    await dragChip(page, 'resource-c1', { x: mechanic.x + 100, y: mechanic.y + 180 }, false);
    await expect(page.getByTestId('hint-slot')).toBeVisible();
    await page.mouse.up();
    await expect(sentence(page)).toContainText('memories');
    await expect
      .poll(async () => (await storedCard(page, 'resource-c1'))?.tuckedUnder)
      .toBe('mechanic-t1');
  });

  test('onePager_dragChipBackIn_againAChip', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const canvas = await boxOf(page.getByTestId('canvas'));
    await dragChip(page, 'resource-c1', { x: canvas.x + 380, y: canvas.y + 560 });
    await expect(cardById(page, 'resource-c1')).toBeVisible();
    await dragTo(page, cardById(page, 'resource-c1'), await emptyPanelPoint(page));
    await expect(chip(page, 'resource-c1')).toBeVisible();
    await expect(lane(page, 'Resources').getByTestId('chip')).toHaveText(['rope', 'memories']);
  });

  test('onePager_chipReleasedOnPanel_noChange', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await dragChip(page, 'resource-c1', await emptyPanelPoint(page));
    await chip(page, 'resource-c2').click();
    await expect(chip(page, 'resource-c1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  test('onePager_resizePanel_widthSavedAfterReload', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    // No edge until a click highlights the panel (user 2026-11-05).
    await expect(panel(page).getByTestId('resize-right')).toHaveCount(0);
    await highlightDetails(page);
    const handle = panel(page).getByTestId('resize-right');
    await expect(handle).toHaveAttribute('aria-label', 'Resize Details');
    const from = await centerOf(handle);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 100, from.y, { steps: 8 });
    await expect.poll(async () => Math.round((await boxOf(panel(page))).width)).toBe(332);
    await page.mouse.up();
    await expect.poll(async () => (await stored(page)).conceptWidth).toBe(332);
    await page.reload();
    await expect(panel(page)).toBeVisible();
    expect(Math.round((await boxOf(panel(page))).width)).toBe(332);
  });

  test('onePager_popOutDragOutResize_eachOneUndoStep', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await chip(page, 'resource-c1').dblclick();
    await expect(cardById(page, 'resource-c1')).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(chip(page, 'resource-c1')).toBeVisible();

    const canvas = await boxOf(page.getByTestId('canvas'));
    await dragChip(page, 'setting-c1', { x: canvas.x + 380, y: canvas.y + 560 });
    await expect(cardById(page, 'setting-c1')).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(chip(page, 'setting-c1')).toBeVisible();

    await highlightDetails(page);
    const handle = await centerOf(panel(page).getByTestId('resize-right'));
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => Math.round((await boxOf(panel(page))).width)).toBe(292);
    await page.keyboard.press('Control+z');
    await expect.poll(async () => Math.round((await boxOf(panel(page))).width)).toBe(232);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});

test.describe('outputs', () => {
  test('onePager_footer_countsTrainPlusConcept', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    // Train 2 + Concept 4; not the Hook Card, the loose Modifier or the note.
    await expect(page.getByTestId('count-badge')).toHaveText('6 cards');
    await dragTo(page, cardById(page, 'modifier-1'), await emptyPanelPoint(page));
    await expect(page.getByTestId('count-badge')).toHaveText('6 cards');
  });

  test('onePager_boardList_showsOnePagerLabel', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await page.goto('/#/');
    await createBoardFromList(page);
    await page.goto('/#/');
    const rows = page.getByRole('list', { name: 'Saved Boards' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const onePager = rows.filter({ hasText: 'One Pager' });
    await expect(onePager.getByTestId('board-kind-label')).toHaveText('One-Pager');
    await expect(
      rows.filter({ hasText: 'Free Board' }).getByTestId('board-kind-label'),
    ).toHaveCount(0);
  });

  test('onePager_textFile_hasConceptSection', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    const download = await exportFile(page, 'Text File');
    const text = await readFile(await download.path(), 'utf8');
    expect(text).toContain(
      'Hooks\n\nYou are a navigator who must trade.\n\nDetails\n\n' +
        'Mechanics\n- climb\n\nResources\n- memories\n- rope\n\nSettings\n- outpost\n\nCards\n\n',
    );
  });
});

/** On the board list: makes a Free Form board named "Free Board" and waits for it to open. */
async function createBoardFromList(page: Page) {
  await page.getByRole('button', { name: 'New Board' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New Board' });
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Free Board');
  await dialog.getByRole('button', { name: 'Make Board' }).click();
  await page.waitForURL(/#\/board\//);
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
}

const importButton = (page: Page) =>
  page.getByRole('button', { name: 'Import Board File' }).first();

/** Chooses a file through Import Board File on the board list. */
async function importFile(page: Page, name: string, buffer: Buffer) {
  const choosing = page.waitForEvent('filechooser');
  await importButton(page).click();
  const chooser = await choosing;
  await chooser.setFiles({ name, buffer, mimeType: 'application/json' });
}

test.describe('upgrade and import', () => {
  test('upgrade_version1Database_opensAsFreeForm', async ({ page }) => {
    // A same-origin page that runs no app code, so nothing opens the database first.
    await page.goto('/pools/role.json');
    const file = version1BoardFile();
    await page.evaluate(
      async (record) => {
        await new Promise<void>((resolve, reject) => {
          // Dexie's native version is the declared version × 10: version 1 is 10.
          const request = indexedDB.open('gameidea', 10);
          request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore('boards', { keyPath: 'id' });
            const index = db.createObjectStore('boardIndex', { keyPath: 'id' });
            index.createIndex('updatedAt', 'updatedAt');
          };
          request.onerror = () => reject(new Error('open failed'));
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['boards', 'boardIndex'], 'readwrite');
            tx.objectStore('boards').put({ ...record, id: 'v1-board' });
            tx.objectStore('boardIndex').put({
              id: 'v1-board',
              name: record.name,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(new Error('write failed'));
          };
        });
      },
      file as Record<string, string>,
    );
    await page.goto('/#/board/v1-board');
    await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
    await expect(canvasCards(page)).toHaveCount((file.cards as unknown[]).length - 1);
    await expect(panel(page)).toHaveCount(0);
    await expect(rail(page).getByRole('button', { name: 'Draw A Hook Card' })).toBeEnabled();
    const [board] = await storedBoards(page);
    expect(board!.formatVersion).toBe(2);
    expect(board!.kind).toBe('free');
    expect(board!.cards.every((card) => card.inConcept === false)).toBe(true);
  });

  test('import_version1BoardFile_opensAsFreeForm', async ({ page }) => {
    await page.goto('/#/');
    await importFile(
      page,
      'Round Trip.gameidea.json',
      Buffer.from(JSON.stringify(version1BoardFile())),
    );
    await expect(page.getByRole('status')).toHaveText('Board imported.');
    await page.getByRole('link', { name: 'Round Trip' }).click();
    await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    const [board] = await storedBoards(page);
    expect(board!.kind).toBe('free');
    expect(board!.formatVersion).toBe(2);
    expect(board!.cards.every((card) => card.inConcept === false)).toBe(true);
  });

  test('import_badOnePagerFile_bannerAndNothingChanged', async ({ page }) => {
    await openBoard(page, onePagerBoard());
    await page.goto('/#/');
    const before = await storedBoards(page);
    const bad = onePagerWith([fixtureCard('hook', { id: 'hook-2', x: 900, y: 900, z: 40 })]);
    await importFile(page, 'Bad.gameidea.json', Buffer.from(JSON.stringify(bad)));
    await expect(page.getByRole('alert')).toContainText(
      'This file is not a GameIdea board file. Nothing changed.',
    );
    expect(await storedBoards(page)).toEqual(before);
  });

  test('import_onePagerFile_roundTrips', async ({ page }) => {
    await openBoard(page, { ...onePagerBoard(), conceptWidth: 400 });
    const download = await exportFile(page, 'Board File');
    const buffer = await readFile(await download.path());
    await page.goto('/#/');
    await importFile(page, 'One Pager.gameidea.json', buffer);
    await expect(page.getByRole('status')).toContainText('Board imported.');
    const stored = await storedBoards(page);
    expect(stored).toHaveLength(2);
    const imported = stored.find((b) => b.id !== 'one-pager')!;
    expect(imported.kind).toBe('onePager');
    expect(imported.conceptWidth).toBe(400);
    expect(imported.cards).toEqual(stored.find((b) => b.id === 'one-pager')!.cards);
    await page.goto(`/#/board/${encodeURIComponent(imported.id)}`);
    await expect(panel(page)).toBeVisible();
    await expect(lane(page, 'Resources').getByTestId('chip')).toHaveText(['memories', 'rope']);
    expect(Math.round((await boxOf(panel(page))).width)).toBe(400);
  });
});
