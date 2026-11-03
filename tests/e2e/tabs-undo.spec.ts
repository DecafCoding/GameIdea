/**
 * Browser tests for 2 tabs on one board (tab-sync) and for undo and redo with the buttons
 * and the keys (design 9.10 and 11).
 */
import { expect, test, type Page } from '@playwright/test';
import { fixtureBoard, fixtureCard, secondModifier } from '@/test/fixtures/boards';
import {
  boxOf,
  canvasCards,
  cardById,
  dragBy,
  dragTo,
  drawFromRail,
  openBoard,
  rail,
} from './board-helpers';

const CHANGED_ELSEWHERE_TEXT =
  'This board changed in another tab. It reloaded here. Undo history was cleared.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const undoButton = (page: Page) => page.getByRole('button', { name: 'Undo' });
const redoButton = (page: Page) => page.getByRole('button', { name: 'Redo' });
const activeCue = (page: Page, id: string) => cardById(page, id).getByTestId('active-cue');

async function waitForSaved(page: Page) {
  await expect(page.getByTestId('save-mark')).toHaveAttribute('data-state', 'saved');
}

/** A page point inside a card, relative to its top-left. */
async function pointOn(page: Page, id: string, dx: number, dy: number) {
  const box = await boxOf(cardById(page, id));
  return { x: box.x + dx, y: box.y + dy };
}

/** Moves the pointer off every card, onto the empty canvas. */
async function pointerToPane(page: Page) {
  const canvas = await boxOf(page.getByTestId('canvas'));
  await page.mouse.move(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
}

test.describe('2 tabs', () => {
  const board = () => fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]);

  test('tabs_changeInOne_otherReloadsAndShowsBanner', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    for (const page of [a, b]) await page.emulateMedia({ reducedMotion: 'reduce' });
    await openBoard(a, board());
    await openBoard(b, board());
    await expect(canvasCards(b)).toHaveCount(1);

    await drawFromRail(a, 'Setting');
    await expect(canvasCards(a)).toHaveCount(2);
    await waitForSaved(a);

    await expect(canvasCards(b)).toHaveCount(2);
    const banner = b.getByRole('status').filter({ hasText: CHANGED_ELSEWHERE_TEXT });
    await expect(banner).toBeVisible();
    await expect(undoButton(b)).toBeDisabled();
    await banner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner).toHaveCount(0);
    await expect(a.getByText(CHANGED_ELSEWHERE_TEXT)).toHaveCount(0);
  });

  test('tabs_deleteInList_otherTabGoesToList', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await openBoard(b, board());
    await a.goto('/');
    await a.getByRole('button', { name: 'Delete Fixture Board' }).click();
    await a.getByRole('dialog').getByRole('button', { name: 'Delete Board' }).click();
    await expect(b.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
    await expect(b.getByRole('list', { name: 'Saved Boards' })).toHaveCount(0);
  });
});

test.describe('undo', () => {
  test('undo_drawAndTurn_buttonsReverse', async ({ page }) => {
    await openBoard(page, fixtureBoard([fixtureCard('setting', { x: 96, y: 96 })]));
    await expect(undoButton(page)).toBeDisabled();
    await drawFromRail(page, 'Player Role');
    await expect(canvasCards(page)).toHaveCount(2);

    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    await pointerToPane(page);
    await page.keyboard.press('r');
    await expect(activeCue(page, 'setting-1')).toHaveText('harbor');

    await undoButton(page).click();
    await expect(activeCue(page, 'setting-1')).toHaveText('outpost');
    await expect(canvasCards(page)).toHaveCount(2);
    await undoButton(page).click();
    await expect(canvasCards(page)).toHaveCount(1);
    await expect(undoButton(page)).toBeDisabled();

    await redoButton(page).click();
    await expect(canvasCards(page)).toHaveCount(2);
    await redoButton(page).click();
    await expect(activeCue(page, 'setting-1')).toHaveText('harbor');
    await expect(redoButton(page)).toBeDisabled();
  });

  test('undo_ctrlZ_reversesDragAndRedoReapplies', async ({ page }) => {
    await openBoard(page, fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]));
    const card = cardById(page, 'role-1');
    const start = await boxOf(card);
    await dragBy(page, card, 200, 100);
    await expect.poll(async () => Math.round((await boxOf(card)).x - start.x)).toBe(200);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => Math.round((await boxOf(card)).x - start.x)).toBe(0);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect.poll(async () => Math.round((await boxOf(card)).x - start.x)).toBe(200);
  });

  test('undo_combineSwapSplitTuck_eachOneStep', async ({ page }) => {
    await openBoard(
      page,
      fixtureBoard([
        fixtureCard('role', { x: 96, y: 96 }),
        fixtureCard('modifier', { x: 528, y: 96, z: 2 }),
        secondModifier({ x: 528, y: 360, z: 3 }),
        fixtureCard('goal', { x: 96, y: 420, z: 4 }),
      ]),
    );

    // Combine.
    await dragTo(page, cardById(page, 'modifier-1'), await pointOn(page, 'role-1', 125, 125));
    await expect(activeCue(page, 'role-1')).toHaveText('exiled navigator');
    // Swap.
    await dragTo(page, cardById(page, 'modifier-2'), await pointOn(page, 'role-1', 125, 125));
    await expect(activeCue(page, 'role-1')).toHaveText('devout navigator');
    // Split.
    await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Split' }).click();
    await expect(activeCue(page, 'role-1')).toHaveText('navigator');
    await expect(canvasCards(page)).toHaveCount(4);
    // Tuck.
    await dragTo(page, cardById(page, 'goal-1'), await pointOn(page, 'role-1', 125, 125));
    await expect
      .poll(async () => {
        const role = await boxOf(cardById(page, 'role-1'));
        const goal = await boxOf(cardById(page, 'goal-1'));
        return Math.round(goal.y - role.y);
      })
      .toBe(59);

    // Each undo steps back one gesture.
    await undoButton(page).click();
    await expect
      .poll(async () => {
        const role = await boxOf(cardById(page, 'role-1'));
        const goal = await boxOf(cardById(page, 'goal-1'));
        return Math.round(goal.y - role.y);
      })
      .not.toBe(59);
    await expect(activeCue(page, 'role-1')).toHaveText('navigator');
    await undoButton(page).click();
    await expect(activeCue(page, 'role-1')).toHaveText('devout navigator');
    await expect(canvasCards(page)).toHaveCount(3);
    await undoButton(page).click();
    await expect(activeCue(page, 'role-1')).toHaveText('exiled navigator');
    await expect(activeCue(page, 'modifier-2')).toHaveText('devout');
    await undoButton(page).click();
    await expect(activeCue(page, 'role-1')).toHaveText('navigator');
    await expect(cardById(page, 'modifier-1')).toHaveCount(1);
    await expect(undoButton(page)).toBeDisabled();
  });

  test('undo_afterReload_historyCleared', async ({ page }) => {
    await openBoard(page);
    await drawFromRail(page, 'Player Role');
    await expect(undoButton(page)).toBeEnabled();
    await waitForSaved(page);
    await page.reload();
    await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
    await expect(canvasCards(page)).toHaveCount(1);
    await expect(undoButton(page)).toBeDisabled();
  });

  test('undo_noteTyping_ctrlZStaysInNote', async ({ page }) => {
    await openBoard(page, fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]));
    await rail(page).getByRole('button', { name: 'Add Note' }).click();
    const field = page.getByRole('textbox', { name: 'Note Text' });
    await expect(field).toBeFocused();
    await page.keyboard.type('A salvage crew');
    await page.keyboard.press('ControlOrMeta+z');
    // The board did not undo the new note: the note and its field are still there.
    await expect(field).toBeFocused();
    await expect(page.getByTestId('note')).toHaveCount(1);
    await expect(canvasCards(page)).toHaveCount(1);
  });
});
