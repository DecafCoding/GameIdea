/**
 * Browser tests for saved boards (design 9.3 and 9.13): a board survives a reload, and the
 * board list shows board cards (meta line, first hook), opens them, and through each card's
 * More menu renames in place, exports the board file and deletes.
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board } from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, canvasCards, drawFromRail, openBoard, rail, storedBoards } from './board-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const saveMark = (page: Page) => page.getByTestId('save-mark');
const boardList = (page: Page) => page.getByRole('list', { name: 'Saved Boards' });
const nameField = (page: Page) => page.getByRole('textbox', { name: 'Board Name' });

/** Opens a board card's More menu and clicks an item. */
async function menuItem(page: Page, board: string, item: string) {
  await page.getByRole('button', { name: `More For ${board}` }).click();
  await page
    .getByRole('menu', { name: `More For ${board}` })
    .getByRole('menuitem', { name: item })
    .click();
}

async function waitForSaved(page: Page) {
  await expect(saveMark(page)).toHaveAttribute('data-state', 'saved');
}

/** The saved view of the open board, read straight from IndexedDB. */
async function storedView(page: Page): Promise<{ panX: number; panY: number } | null> {
  return page.evaluate(async () => {
    const id = decodeURIComponent(location.hash.replace('#/board/', ''));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gameidea');
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
    await drawFromRail(page, 'Player Role');
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
  await drawFromRail(page, 'Player Role');
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
  await expect(
    rail(page).getByRole('button', { name: 'Draw A Player Role', exact: true }),
  ).toBeEnabled();
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
  await expect(
    page.getByText(
      'Each board is one place to draw cards and build hooks. Boards stay in this browser.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Board' }).first()).toBeEnabled();
  await expect(boardList(page)).toHaveCount(0);
  const empty = page.getByRole('region', { name: 'No Boards Yet' });
  await expect(empty).toBeVisible();
  await expect(empty.getByRole('button', { name: 'Import Board File' })).toBeVisible();
  await expect(empty.getByRole('button', { name: 'New Board' })).toBeVisible();
});

test('boardList_twoBoards_newestFirstWithCaption', async ({ page }) => {
  await makeBoard(page, 'Salvage Run', true);
  await makeBoard(page, 'Two Captains');
  await expect(boardList(page).getByRole('link')).toHaveText(['Two Captains', 'Salvage Run']);
  await expect(boardList(page).getByText('Edited just now · 1 card · no hook yet')).toBeVisible();
  await boardList(page).getByRole('link', { name: 'Salvage Run' }).click();
  await expect(nameField(page)).toHaveValue('Salvage Run');
  await expect(canvasCards(page)).toHaveCount(1);
});

test('boardList_clickAnywhereOnCard_opensBoard', async ({ page }) => {
  await makeBoard(page, 'Salvage Run', true);
  const card = boardList(page).getByRole('listitem').first();
  const box = await boxOf(card);
  // The bottom-left corner: away from the name link and the More button.
  await page.mouse.click(box.x + 12, box.y + box.height - 12);
  await expect(nameField(page)).toHaveValue('Salvage Run');
});

test('boardList_moreButton_opensMenuNotBoard', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await page.getByRole('button', { name: 'More For Salvage Run' }).click();
  await expect(page.getByRole('menu', { name: 'More For Salvage Run' })).toBeVisible();
  await expect(boardList(page)).toBeVisible();
});

test('boardList_rename_enterSaves', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await menuItem(page, 'Salvage Run', 'Rename');
  const field = boardList(page).getByRole('textbox', { name: 'Board Name' });
  await expect(field).toBeFocused();
  await expect(page.getByText('Enter saves. Esc cancels.')).toBeVisible();
  await field.fill('Drift');
  await field.press('Enter');
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
  await page.reload();
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
});

test('boardList_rename_escCancels', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await menuItem(page, 'Salvage Run', 'Rename');
  const field = boardList(page).getByRole('textbox', { name: 'Board Name' });
  await field.fill('Drift');
  await field.press('Escape');
  await expect(boardList(page).getByRole('link')).toHaveText(['Salvage Run']);
});

test('boardList_delete_dialogConfirmRemoves', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await makeBoard(page, 'Two Captains');
  await menuItem(page, 'Salvage Run', 'Delete');
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
  await menuItem(page, 'Salvage Run', 'Delete');
  const dialog = page.getByRole('dialog', { name: 'Delete "Salvage Run"?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await menuItem(page, 'Salvage Run', 'Delete');
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
  await openBoard(page, fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]));
  await page.getByRole('link', { name: 'Board List' }).click();
  await expect(boardList(page).getByRole('link')).toHaveText(['Fixture Board']);
  await expect(boardList(page)).toContainText('1 card · no hook yet');
});

test('boardList_card_showsFirstHookAndMeta', async ({ page }) => {
  const board = {
    ...fixtureBoard([
      fixtureCard('hook', { x: 96, y: 96 }),
      fixtureCard('role', { x: 116, y: 152, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { x: 116, y: 208, z: 3, tuckedUnder: 'role-1' }),
    ]),
    id: 'lighthouse',
    name: 'Lighthouse',
  };
  await openBoard(page, board);
  const sentence = (await page.getByTestId('hook-sentence').textContent())!.trim();
  await page.getByRole('link', { name: 'Board List' }).click();
  const card = boardList(page).getByRole('listitem').filter({ hasText: 'Lighthouse' });
  await expect(card.getByTestId('hook-preview')).toHaveText(sentence);
  await expect(card).toContainText('· 3 cards · 1 hook');
  await expect(card.locator('[data-type]')).toHaveCount(3);
});

test('boardList_menuExport_downloadsBoardFile', async ({ page }) => {
  await openBoard(page, {
    ...fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]),
    name: 'Drift',
  });
  await page.getByRole('link', { name: 'Board List' }).click();
  const downloading = page.waitForEvent('download');
  await menuItem(page, 'Drift', 'Export Board File');
  const download = await downloading;
  expect(download.suggestedFilename().replaceAll('_', ' ')).toBe('Drift.gameidea.json');
  const parsed = JSON.parse(await readFile(await download.path(), 'utf8')) as Board;
  const [stored] = await storedBoards(page);
  expect(parsed).toEqual(stored);
});

test('boardList_renameClickOutside_saves', async ({ page }) => {
  await makeBoard(page, 'Salvage Run');
  await menuItem(page, 'Salvage Run', 'Rename');
  const field = boardList(page).getByRole('textbox', { name: 'Board Name' });
  await field.fill('Drift');
  await page.getByRole('heading', { level: 1, name: 'Boards' }).click();
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
  await page.reload();
  await expect(boardList(page).getByRole('link')).toHaveText(['Drift']);
});
