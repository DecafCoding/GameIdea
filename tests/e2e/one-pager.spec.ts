/**
 * Browser tests for One-Pager boards (docs/feature-one-pager-board.html, design 9.15):
 * New Board makes either kind, a One-Pager board starts with its 1 Hook Card, and its
 * Hook Card menu and rail stop a second Hook Card.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { canvasCards, openBoard, rail, storedBoards } from './board-helpers';

const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');
const hookMenu = (page: Page) => page.getByTestId('hook-menu');

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('onePager_newBoard_opensWithItsHookCard', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(page.locator('.react-flow__node [data-card][data-type="hook"]')).toHaveCount(1);
  await expect
    .poll(async () => (await storedBoards(page)).map((b) => [b.kind, b.conceptWidth]))
    .toEqual([['onePager', 232]]);
  const [board] = await storedBoards(page);
  expect(board!.cards.filter((card) => card.type === 'hook')).toHaveLength(1);
});

test('onePager_newBoardDefault_isFreeForm', async ({ page }) => {
  await openBoard(page);
  await expect(page.getByTestId('start-here')).toBeVisible();
  await expect.poll(async () => (await storedBoards(page)).map((b) => b.kind)).toEqual(['free']);
});

test('onePager_hookMenu_copyAndRedrawOnly', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await hookCard(page).hover({ position: { x: 120, y: 40 } });
  await expect(hookMenu(page)).toBeVisible();
  await expect(hookMenu(page).getByRole('button', { name: 'Copy Hook' })).toBeVisible();
  await expect(hookMenu(page).getByRole('button', { name: 'Redraw All' })).toBeVisible();
  await expect(hookMenu(page).getByRole('button', { name: 'Duplicate' })).toHaveCount(0);
  await expect(hookMenu(page).getByRole('button', { name: 'Discard' })).toHaveCount(0);
});

test('onePager_railHookButton_disabled', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(rail(page).getByRole('button', { name: 'Draw A Hook Card' })).toBeDisabled();
});
