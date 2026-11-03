/**
 * Browser tests for saved boards (design 9.8 and 9.10): a board survives a reload, and the
 * board list shows, opens, renames and deletes boards.
 */
import { expect, test, type Page } from '@playwright/test';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, canvasCards, drawFromRail, openBoard, rail } from './board-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const saveMark = (page: Page) => page.getByTestId('save-mark');
const boardList = (page: Page) => page.getByRole('list', { name: 'Saved Boards' });
const nameField = (page: Page) => page.getByRole('textbox', { name: 'Board Name' });

async function waitForSaved(page: Page) {
  await expect(saveMark(page)).toHaveAttribute('data-state', 'saved');
}

/** The saved view of the open board, read straight from IndexedDB. */
async function storedView(page: Page): Promise<{ panX: number; panY: number } | null> {
  return page.evaluate(async () => {
    const id = decodeURIComponent(location.hash.replace('#/board/', ''));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('theforge');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('open failed'));
    });
    const record = await new Promise<{ view: { panX: number; panY: number } } | undefined>(
      (resolve, reject) => {
        const request = db.transaction('boards').objectStore('boards').get(id);
        request.onsuccess = () => resolve(request.result as never);
        request.onerror = () => reject(new Error('read failed'));
      },
    );
    db.close();
    return record?.view ?? null;
  });
}

/** Saves boards through the app: New Board, rename in the top bar, back to the list. */
async function makeBoard(page: Page, name: string, draw = false) {
  await openBoard(page);
  if (draw) {
    await drawFromRail(page, 'Character');
    await expect(canvasCards(page)).toHaveCount(1);
  }
  await nameField(page).fill(name);
  await nameField(page).press('Enter');
  await waitForSaved(page);
  await page.getByRole('link', { name: 'Board List' }).click();
  await expect(boardList(page)).toBeVisible();
}

test('persistence_drawThenReload_boardSurvives', async ({ page }) => {
  await openBoard(page);
  await drawFromRail(page, 'Character');
  const node = page.locator('.react-flow__node:has([data-card])').first();
  const id = await node.getAttribute('data-id');
  const cue = await node.getByTestId('active-cue').textContent();

  await rail(page).getByRole('button', { name: 'Add Note' }).click();
  await page.keyboard.type('A salvage crew');
  await page.keyboard.press('Escape');
  await nameField(page).fill('Salvage Run');
  await nameField(page).press('Enter');

  // Pan by dragging the empty canvas.
  const canvas = await boxOf(page.getByTestId('canvas'));
  const start = { x: canvas.x + 150, y: canvas.y + 150 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y + 90, { steps: 8 });
  await page.mouse.up();
  // The pan saves when the move ends; wait until storage has it.
  await expect.poll(async () => (await storedView(page))?.panX ?? 0).not.toBe(0);
  await waitForSaved(page);
  const before = await boxOf(node);

  await page.reload();
  await expect(rail(page).getByRole('button', { name: 'Draw A Character' })).toBeEnabled();
  const after = page.locator(`.react-flow__node[data-id="${id}"]`);
  await expect(after.getByTestId('active-cue')).toHaveText(cue!);
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(page.getByTestId('note')).toContainText('A salvage crew');
  await expect(nameField(page)).toHaveValue('Salvage Run');
  const box = await boxOf(after);
  expect(Math.abs(box.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y - before.y)).toBeLessThanOrEqual(1);
});

test('boardList_emptyStart_showsHeaderAndNewBoard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
  await expect(page.getByText('Runs on your computer. Nothing leaves it.')).toBeVisible();
  await expect(
    page.getByText('Each board holds one story idea: its cards and its premise.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Board' })).toBeEnabled();
  await expect(boardList(page)).toHaveCount(0);
});

test('boardList_twoBoards_newestFirstWithCaption', async ({ page }) => {
  await makeBoard(page, 'Salvage Run', true);
  await makeBoard(page, 'Two Captains');
  await expect(boardList(page).getByRole('link')).toHaveText(['Two Captains', 'Salvage Run']);
  await expect(boardList(page).getByText('1 card · 0 notes · edited just now')).toBeVisible();
  await boardList(page).getByRole('link', { name: 'Salvage Run' }).click();
  await expect(nameField(page)).toHaveValue('Salvage Run');
  await expect(canvasCards(page)).toHaveCount(1);
});

test('boardList_rename_enterSaves', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await page.getByRole('button', { name: 'Rename Salvage Run' }).click();
  const field = boardList(page).getByRole('textbox', { name: 'Board Name' });
  await expect(field).toBeFocused();
  await expect(page.getByText('Enter saves · Esc cancels')).toBeVisible();
  await field.fill('Drift');
  await field.press('Enter');
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
  await page.reload();
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
});

test('boardList_rename_escCancels', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await page.getByRole('button', { name: 'Rename Salvage Run' }).click();
  const field = boardList(page).getByRole('textbox', { name: 'Board Name' });
  await field.fill('Drift');
  await field.press('Escape');
  await expect(boardList(page).getByRole('link')).toHaveText(['Salvage Run']);
});

test('boardList_delete_dialogConfirmRemoves', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await makeBoard(page, 'Two Captains');
  await page.getByRole('button', { name: 'Delete Salvage Run' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete "Salvage Run"?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Delete Board' }).click();
  await expect(dialog).toBeHidden();
  await expect(boardList(page).getByRole('link')).toHaveText(['Two Captains']);
  await page.reload();
  await expect(boardList(page).getByRole('link')).toHaveText(['Two Captains']);
});

test('boardList_delete_cancelKeeps', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await page.getByRole('button', { name: 'Delete Salvage Run' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete "Salvage Run"?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Delete Salvage Run' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(boardList(page).getByRole('link')).toHaveText(['Salvage Run']);
});

test('boardRoute_unknownId_goesToList', async ({ page }) => {
  await page.goto('/#/board/no-such-board');
  await expect(page.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
});

test('topBar_boardListLink_showsBoardInList', async ({ page }) => {
  await openBoard(page, fixtureBoard([fixtureCard('character', { x: 96, y: 96 })]));
  await page.getByRole('link', { name: 'Board List' }).click();
  await expect(boardList(page).getByRole('link')).toHaveText(['Fixture Board']);
  await expect(boardList(page)).toContainText('1 card · 0 notes');
});
