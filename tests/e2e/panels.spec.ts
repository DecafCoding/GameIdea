/**
 * Browser tests for the 4 One-Pager panels as 1 family (user 2026-11-05): the Hook Card,
 * the Core Loop card, the Details panel and the Questions panel share the 2 px accent
 * border and React Flow's grab cursor; a click highlights the Details panel, the Core Loop
 * card or the Questions panel (never the Hook Card) and shows its 2 resize edges; a
 * right-edge drag keeps the left side still, a left-edge drag keeps the right side still,
 * each resize is 1 undo step and survives a reload, and the Core Loop card's height follows
 * its text at the new width.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board } from '@/shared/model';
import { onePagerWithAnswers } from '@/test/fixtures/boards';
import { boxOf, openBoard, storedBoards } from './board-helpers';

const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');
const loopCard = (page: Page) => page.getByTestId('loop-card');
const details = (page: Page) => page.getByTestId('concept-panel');
const questions = (page: Page) => page.getByTestId('questions-panel');
const loopNode = (page: Page) => page.locator('.react-flow__node-loop');
const questionsNode = (page: Page) => page.locator('.react-flow__node-questions');
const undoButton = (page: Page) => page.getByRole('button', { name: 'Undo' });

async function stored(page: Page): Promise<Board> {
  const boards = await storedBoards(page);
  expect(boards).toHaveLength(1);
  return boards[0]!;
}

/** Presses an edge and moves it dx screen pixels at zoom 1. */
async function dragEdge(edge: Locator, dx: number, page: Page) {
  const box = await boxOf(edge);
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + dx, at.y, { steps: 6 });
  await page.mouse.up();
}

const widthOf = async (locator: Locator) => Math.round((await boxOf(locator)).width);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page, onePagerWithAnswers());
});

test('panels_allFour_sameAccentBorder', async ({ page }) => {
  const look = (locator: Locator) =>
    locator.evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`;
    });
  const hook = await look(hookCard(page));
  expect(hook).toMatch(/^2px solid /);
  expect(await look(loopCard(page))).toBe(hook);
  expect(await look(details(page))).toBe(hook);
  expect(await look(questions(page))).toBe(hook);
});

test('panels_allFour_grabCursor', async ({ page }) => {
  const cursor = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).cursor);
  for (const panel of [hookCard(page), loopCard(page), details(page), questions(page)]) {
    expect(await cursor(panel)).toBe('grab');
  }
  // The panel titles too, which are the usual place to grab a panel.
  expect(await cursor(details(page).getByRole('heading', { name: 'Details' }))).toBe('grab');
  expect(await cursor(questions(page).getByRole('heading', { name: 'Questions' }))).toBe('grab');
});

test('panels_click_highlightsOneAndShowsEdges', async ({ page }) => {
  await expect(page.getByTestId('resize-right')).toHaveCount(0);
  await details(page).getByRole('heading', { name: 'Details' }).click();
  await expect(details(page)).toHaveAttribute('data-highlighted', '');
  await expect(page.getByTestId('resize-right')).toHaveCount(1);

  await questions(page).getByRole('heading', { name: 'Questions' }).click();
  await expect(details(page)).not.toHaveAttribute('data-highlighted', '');
  await expect(questionsNode(page).locator('[data-highlighted]')).toHaveCount(1);
  await expect(page.getByTestId('resize-left')).toHaveCount(1);

  // The Hook Card never highlights; a click on it clears the highlight.
  await hookCard(page).click({ position: { x: 120, y: 20 } });
  await expect(page.getByTestId('resize-right')).toHaveCount(0);

  await loopCard(page).getByRole('heading', { name: 'Core Loop' }).click();
  await expect(loopNode(page).locator('[data-highlighted]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('resize-right')).toHaveCount(0);
});

test('panels_loopRightEdge_resizesSavesAndUndoes', async ({ page }) => {
  await loopCard(page).getByRole('heading', { name: 'Core Loop' }).click();
  const left = (await boxOf(loopCard(page))).x;
  await dragEdge(loopNode(page).getByTestId('resize-right'), 80, page);
  await expect.poll(() => widthOf(loopCard(page))).toBe(320);
  expect(Math.round((await boxOf(loopCard(page))).x)).toBe(Math.round(left));
  await expect
    .poll(async () => (await stored(page)).cards.find((c) => c.type === 'loop')?.width)
    .toBe(320);
  await page.reload();
  await expect.poll(() => widthOf(loopCard(page))).toBe(320);
  // A reload clears undo, so check the undo step on a fresh resize.
  await loopCard(page).getByRole('heading', { name: 'Core Loop' }).click();
  await dragEdge(loopNode(page).getByTestId('resize-right'), -40, page);
  await expect.poll(() => widthOf(loopCard(page))).toBe(280);
  await undoButton(page).click();
  await expect.poll(() => widthOf(loopCard(page))).toBe(320);
  await expect(undoButton(page)).toBeDisabled();
});

test('panels_loopResize_heightFitsTextAtNewWidth', async ({ page }) => {
  const field = loopCard(page).getByRole('textbox', { name: 'Core Loop Text' });
  const heightOf = async () => Math.round((await boxOf(field)).height);
  const fits = () => field.evaluate((el) => Math.abs(el.scrollHeight - el.clientHeight) <= 1);
  await field.click();
  await field.fill(
    'trade stories for coin → earn memories of the road → spend them on a better wagon → reach the coast before winter',
  );
  await page.keyboard.press('Escape');
  const narrow = await heightOf();
  expect(narrow).toBeGreaterThan(60);
  await loopCard(page).getByRole('heading', { name: 'Core Loop' }).click();
  await dragEdge(loopNode(page).getByTestId('resize-right'), 160, page);
  await expect.poll(() => widthOf(loopCard(page))).toBe(400);
  await expect.poll(heightOf).toBeLessThan(narrow);
  expect(await fits()).toBe(true);
  // Narrower again: the field grows back with no hidden text.
  await dragEdge(loopNode(page).getByTestId('resize-right'), -160, page);
  await expect.poll(() => widthOf(loopCard(page))).toBe(240);
  await expect.poll(heightOf).toBe(narrow);
  expect(await fits()).toBe(true);
});

test('panels_questionsLeftEdge_keepsRightSideStill', async ({ page }) => {
  await questions(page).getByRole('heading', { name: 'Questions' }).click();
  const before = await boxOf(questions(page));
  await dragEdge(questionsNode(page).getByTestId('resize-left'), -60, page);
  await expect.poll(() => widthOf(questions(page))).toBe(300);
  const after = await boxOf(questions(page));
  expect(Math.round(after.x + after.width)).toBe(Math.round(before.x + before.width));
  await expect.poll(async () => (await stored(page)).questionsWidth).toBe(300);
  expect((await stored(page)).questionsPos).toEqual({ x: 564, y: 312 });
});

test('panels_detailsLeftEdge_keepsRightSideStill', async ({ page }) => {
  await details(page).getByRole('heading', { name: 'Details' }).click();
  const before = await boxOf(details(page));
  await dragEdge(details(page).getByTestId('resize-left'), -40, page);
  await expect.poll(() => widthOf(details(page))).toBe(272);
  const after = await boxOf(details(page));
  expect(Math.round(after.x + after.width)).toBe(Math.round(before.x + before.width));
  await expect.poll(async () => (await stored(page)).conceptWidth).toBe(272);
});
