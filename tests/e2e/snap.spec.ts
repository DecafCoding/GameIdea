/**
 * Browser tests for Snap To Grid (docs/feature-settings-and-theme.html, design 10): with
 * snap on, a dropped free card or note sits on a 24 px dot; Alt held at the drop places it
 * freely; a tuck keeps its tuck place; with snap off every drop is free; a drop is one undo
 * step; turning snap on moves nothing already on the board.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Note } from '@/shared/model';
import { fixtureBoard, fixtureCard, fixtureNote } from '@/test/fixtures/boards';
import {
  boxOf,
  cardById,
  dragBy,
  dragTo,
  openBoard,
  rail,
  storedBoards,
  waitForStoredCard,
} from './board-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const onGrid = (v: number) => v % 24 === 0;
const single = () => fixtureBoard([fixtureCard('goal', { x: 96, y: 96 })]);

/** The stored note once it has moved from where the fixture put it. */
async function movedNote(page: Page, from: { x: number; y: number }): Promise<Note> {
  let found: Note | undefined;
  await expect
    .poll(async () => {
      const [board] = await storedBoards(page);
      found = board?.notes.find((n) => n.x !== from.x || n.y !== from.y);
      return found !== undefined;
    })
    .toBe(true);
  return found!;
}

test.describe('snap on (default)', () => {
  test('snap_on_freeCardDropSitsOnGridDot', async ({ page }) => {
    const board = single();
    await openBoard(page, board);
    await dragBy(page, cardById(page, 'goal-1'), 137, 53);
    const card = await waitForStoredCard(page, board.id, 'goal-1', (c) => c.x !== 96);
    expect(onGrid(card.x) && onGrid(card.y)).toBe(true);
    expect(card).toMatchObject({ x: 240, y: 144 });
  });

  test('snap_altHeld_dropSitsWherePlaced', async ({ page }) => {
    const board = single();
    await openBoard(page, board);
    const box = await boxOf(cardById(page, 'goal-1'));
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 30 + 137, box.y + 30 + 53, { steps: 12 });
    await page.keyboard.down('Alt');
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const card = await waitForStoredCard(page, board.id, 'goal-1', (c) => c.x !== 96);
    expect(card).toMatchObject({ x: 233, y: 149 });
  });

  test('snap_on_noteDropSitsOnGridDot', async ({ page }) => {
    await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Move me' })]));
    await dragBy(page, page.getByTestId('note'), 137, 53, { x: 40, y: 12 });
    const note = await movedNote(page, { x: 96, y: 96 });
    expect(note).toMatchObject({ x: 240, y: 144 });
  });

  test('snap_on_tuckKeepsTuckPlace', async ({ page }) => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 101, y: 101 }),
      fixtureCard('goal', { x: 528, y: 96, z: 2 }),
    ]);
    await openBoard(page, board);
    const role = await boxOf(cardById(page, 'role-1'));
    await dragTo(page, cardById(page, 'goal-1'), { x: role.x + 100, y: role.y + 100 });
    const goal = await waitForStoredCard(page, board.id, 'goal-1', (c) => c.tuckedUnder !== null);
    // 56 px under its parent, off the grid: tuck ignores snap.
    expect(goal).toMatchObject({ tuckedUnder: 'role-1', x: 101, y: 157 });
  });

  test('snap_drop_isOneUndoStep', async ({ page }) => {
    const board = single();
    await openBoard(page, board);
    await dragBy(page, cardById(page, 'goal-1'), 137, 53);
    await waitForStoredCard(page, board.id, 'goal-1', (c) => c.x === 240);
    await page.keyboard.press('Control+z');
    await waitForStoredCard(page, board.id, 'goal-1', (c) => c.x === 96 && c.y === 96);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});

test.describe('snap off', () => {
  test.use({ settings: { snap: false } });

  test('snap_off_everyDropFree', async ({ page }) => {
    const board: Board = fixtureBoard(
      [fixtureCard('goal', { x: 96, y: 96 })],
      [fixtureNote({ x: 96, y: 480, text: 'Move me' })],
    );
    await openBoard(page, board);
    await dragBy(page, cardById(page, 'goal-1'), 137, 53);
    const card = await waitForStoredCard(page, board.id, 'goal-1', (c) => c.x !== 96);
    expect(card).toMatchObject({ x: 233, y: 149 });
    await dragBy(page, page.getByTestId('note'), 137, 53, { x: 40, y: 12 });
    const note = await movedNote(page, { x: 96, y: 480 });
    expect(note).toMatchObject({ x: 233, y: 533 });
  });

  test('snap_turnOn_movesNothing', async ({ page }) => {
    const board = fixtureBoard(
      [fixtureCard('goal', { x: 101, y: 103 })],
      [fixtureNote({ x: 413, y: 107 })],
    );
    await openBoard(page, board);
    const before = await boxOf(cardById(page, 'goal-1'));
    await rail(page).getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    const snap = dialog.getByRole('switch', { name: 'Snap To Grid' });
    await expect(snap).toHaveAttribute('aria-checked', 'false');
    await snap.click();
    await expect(snap).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('button', { name: 'Done' }).click();
    const [stored] = await storedBoards(page);
    expect(stored!.cards[0]).toMatchObject({ x: 101, y: 103 });
    expect(stored!.notes[0]).toMatchObject({ x: 413, y: 107 });
    expect(await boxOf(cardById(page, 'goal-1'))).toEqual(before);
  });
});
