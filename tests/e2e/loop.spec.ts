/**
 * Browser tests for the Core Loop card (docs/feature-core-loop-card.html, design 9.16) on
 * the fixture pools: a new One-Pager board places 1 card at (680, 96), a deal fills the
 * live template and the field, a ring turn updates both until the first edit, an edit is 1
 * undo step and 1 save, Reset From Cards and an empty edit bring the live text back, Copy
 * Loop and its fallback, the card drags and snaps but never tucks or enters Details, it is
 * never selected, an older One-Pager board loads without it, the text file has the Core
 * Loop section after Hooks, and the Boards page shows the ownership line. The clipboard is
 * stubbed in the page, because clipboard permissions exist only in Chromium.
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card } from '@/shared/model';
import { onePagerBoard, onePagerWithLoop } from '@/test/fixtures/boards';
import { boxOf, cardById, dragTo, openBoard, storedBoards } from './board-helpers';
import { exportFile } from './export-helpers';

declare global {
  interface Window {
    __copied?: string;
  }
}

/** Stubs navigator.clipboard.writeText: it stores the text, or rejects when blocked. */
async function stubClipboard(page: Page, blocked = false) {
  await page.addInitScript((block) => {
    const writeText = (text: string) => {
      if (block) return Promise.reject(new Error('NotAllowedError'));
      window.__copied = text;
      return Promise.resolve();
    };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  }, blocked);
}

const loopCard = (page: Page) => page.getByTestId('loop-card');
const template = (page: Page) => page.getByTestId('loop-template');
const field = (page: Page) => page.getByRole('textbox', { name: 'Core Loop Text' });
const loopMenu = (page: Page) => page.getByTestId('loop-menu');
const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');
const hookMenu = (page: Page) => page.getByTestId('hook-menu');
const sentence = (page: Page) => page.getByTestId('hook-sentence');
const panel = (page: Page) => page.getByTestId('concept-panel');

const OWNERSHIP =
  'Each board is one place to draw cards and build hooks. Boards stay in this browser. ' +
  'Every idea you make here is yours to use, with no credit needed.';

async function storedOnly(page: Page): Promise<Board> {
  const boards = await storedBoards(page);
  expect(boards).toHaveLength(1);
  return boards[0]!;
}

async function storedLoop(page: Page): Promise<Card | undefined> {
  return (await storedOnly(page)).cards.find((c) => c.type === 'loop');
}

/** A new One-Pager board, dealt from the Hook Card menu. */
async function dealtOnePager(page: Page) {
  await openBoard(page, undefined, 'One-Pager');
  await hookCard(page).hover({ position: { x: 120, y: 40 } });
  await expect(hookMenu(page)).toBeVisible();
  await hookMenu(page).getByRole('button', { name: 'Deal Stack' }).click();
  await expect(template(page).locator('[data-loop-step]')).toHaveCount(4);
}

/** The train Mechanic's id, from the stored board. */
async function trainMechanicId(page: Page): Promise<string> {
  const board = await storedOnly(page);
  return board.cards.find((c) => c.type === 'mechanic' && c.tuckedUnder !== null)!.id;
}

/** Hovers the train Mechanic's visible bottom band and presses R. */
async function turnMechanic(page: Page) {
  const id = await trainMechanicId(page);
  await cardById(page, id).hover({ position: { x: 120, y: 180 } });
  await page.keyboard.press('r');
}

/** Clicks the empty canvas left of the Hook Card (blurs the field). */
async function clickEmptyCanvas(page: Page) {
  const box = await boxOf(page.getByTestId('canvas'));
  await page.mouse.click(box.x + 30, box.y + 320);
}

/** Hovers the Core Loop card so its menu shows. */
async function openLoopMenu(page: Page) {
  await loopCard(page).hover({ position: { x: 120, y: 20 } });
  await expect(loopMenu(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('loop_newOnePager_oneCardAt680x96', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(loopCard(page)).toHaveCount(1);
  await expect(loopCard(page)).toBeVisible();
  await expect(template(page)).toHaveText('Deal or draw cards to build the loop.');
  await expect
    .poll(async () => (await storedOnly(page)).cards.filter((c) => c.type === 'loop'))
    .toHaveLength(1);
  expect(await storedLoop(page)).toMatchObject({ x: 680, y: 96, tuckedUnder: null });
  expect(await storedLoop(page)).not.toHaveProperty('loopText');

  await page.goto('/');
  await openBoard(page);
  await expect(loopCard(page)).toHaveCount(0);
});

test('loop_deal_templateAndFieldShowLiveText', async ({ page }) => {
  await dealtOnePager(page);
  const steps = template(page).locator('[data-loop-step]');
  expect(
    await steps.evaluateAll((els) => els.map((el) => el.getAttribute('data-loop-step'))),
  ).toEqual(['mechanic', 'resource', 'progression', 'goal']);
  const text = await template(page).textContent();
  expect(text).toMatch(/ → earn .+ → .+ → to /);
  await expect(field(page)).toHaveValue(text!);
});

test('loop_ringTurn_updatesTemplateAndUneditedField', async ({ page }) => {
  await dealtOnePager(page);
  const before = await template(page).textContent();
  await turnMechanic(page);
  await expect(template(page)).not.toHaveText(before!);
  const after = await template(page).textContent();
  await expect(field(page)).toHaveValue(after!);
});

test('loop_edit_oneUndoStepAndOneSave', async ({ page }) => {
  await dealtOnePager(page);
  const live = await template(page).textContent();
  await field(page).click();
  await field(page).fill('dig → sell the ore → dig deeper');
  // Typing saves nothing.
  expect(await storedLoop(page)).not.toHaveProperty('loopText');
  await clickEmptyCanvas(page);
  await expect
    .poll(async () => (await storedLoop(page))?.loopText)
    .toBe('dig → sell the ore → dig deeper');

  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await storedLoop(page))?.loopText).toBeUndefined();
  await expect(field(page)).toHaveValue(live!);
});

test('loop_editedThenRingTurn_templateOnly', async ({ page }) => {
  await dealtOnePager(page);
  await field(page).click();
  await field(page).fill('my own loop');
  await clickEmptyCanvas(page);
  await expect.poll(async () => (await storedLoop(page))?.loopText).toBe('my own loop');

  const before = await template(page).textContent();
  await turnMechanic(page);
  await expect(template(page)).not.toHaveText(before!);
  await expect(field(page)).toHaveValue('my own loop');

  await openLoopMenu(page);
  const reset = loopMenu(page).getByRole('button', { name: 'Reset From Cards' });
  await expect(reset).toBeVisible();
  await reset.click();
  await expect.poll(async () => (await storedLoop(page))?.loopText).toBeUndefined();
  await expect(field(page)).toHaveValue((await template(page).textContent())!);
  await expect(loopMenu(page).getByRole('button', { name: 'Reset From Cards' })).toHaveCount(0);
});

test('loop_emptyEdit_returnsToLiveText', async ({ page }) => {
  await dealtOnePager(page);
  await field(page).click();
  await field(page).fill('my own loop');
  await clickEmptyCanvas(page);
  await expect.poll(async () => (await storedLoop(page))?.loopText).toBe('my own loop');

  await field(page).click();
  await field(page).fill('');
  await clickEmptyCanvas(page);
  await expect.poll(async () => (await storedLoop(page))?.loopText).toBeUndefined();
  await expect(field(page)).toHaveValue((await template(page).textContent())!);
});

test('loop_copyLoop_putsShownTextOnClipboard', async ({ page }) => {
  await stubClipboard(page);
  await dealtOnePager(page);
  const text = await template(page).textContent();
  await openLoopMenu(page);
  await loopMenu(page).getByRole('button', { name: 'Copy Loop' }).click();
  await expect(loopMenu(page).getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => window.__copied)).toBe(text);
});

test('loop_copyLoopBlocked_showsFallbackDialog', async ({ page }) => {
  await stubClipboard(page, true);
  await dealtOnePager(page);
  const text = await template(page).textContent();
  await openLoopMenu(page);
  await loopMenu(page).getByRole('button', { name: 'Copy Loop' }).click();
  const dialog = page.getByRole('dialog', { name: 'Copy The Loop' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Core Loop' })).toHaveValue(text!);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
});

test('loop_drag_snapsAndNeverTucks', async ({ page }) => {
  await dealtOnePager(page);
  const loopText = await template(page).textContent();
  // Onto the Hook Card: a plain move, snapped to the grid.
  const hook = await boxOf(hookCard(page));
  await dragTo(page, loopCard(page), { x: hook.x + 130, y: hook.y + 30 }, { x: 30, y: 16 });
  await expect
    .poll(async () => {
      const loop = await storedLoop(page);
      return loop && loop.x !== 680;
    })
    .toBe(true);
  const moved = (await storedLoop(page))!;
  expect(moved.tuckedUnder).toBeNull();
  expect(moved.x % 24).toBe(0);
  expect(moved.y % 24).toBe(0);
  expect((await storedOnly(page)).cards.some((c) => c.tuckedUnder === moved.id)).toBe(false);

  // Over the Details panel: it stays a free card where it was released.
  const box = await boxOf(panel(page));
  await dragTo(page, loopCard(page), { x: box.x + box.width / 2, y: box.y + 60 }, { x: 30, y: 16 });
  await expect
    .poll(async () => {
      const loop = await storedLoop(page);
      return loop && loop.x !== moved.x;
    })
    .toBe(true);
  expect(await storedLoop(page)).toMatchObject({ inConcept: false, tuckedUnder: null });
  await expect(loopCard(page)).toBeVisible();
  await expect(sentence(page)).not.toContainText(loopText!);
});

test('loop_noDuplicateDiscardOrSelect', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await openLoopMenu(page);
  const labels = await loopMenu(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(labels).toEqual(['Copy Loop']);
  await template(page).click();
  await page.keyboard.press('Delete');
  await page.keyboard.press('Backspace');
  await expect(loopCard(page)).toHaveCount(1);
  expect(await storedLoop(page)).toBeDefined();
});

test('loop_oldOnePagerBoard_loadsWithoutLoopCard', async ({ page }) => {
  await openBoard(page, onePagerBoard());
  await expect(hookCard(page)).toHaveCount(1);
  await expect(panel(page)).toBeVisible();
  await expect(sentence(page)).toHaveText('You are a navigator who must trade.');
  await expect(loopCard(page)).toHaveCount(0);
  expect((await storedOnly(page)).cards.some((c) => c.type === 'loop')).toBe(false);
});

test('loop_textFile_coreLoopAfterHooks', async ({ page }) => {
  await dealtOnePager(page);
  const hook = await sentence(page).textContent();
  const loop = await template(page).textContent();
  const download = await exportFile(page, 'Text File');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain(`Hooks\n\n${hook}\n\nCore Loop\n\n${loop}\n\nDetails\n`);
});

test('boardList_ownershipLine_shown', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(OWNERSHIP)).toBeVisible();
});

test(
  'perf_ringTurn_updatesLoopTemplateUnder100ms',
  { tag: '@timing' },
  async ({ page, browserName }) => {
    // The WebKit limit stays at the user's 2026-11-04 temporary 300 ms; Chromium and Firefox 100.
    const limit = browserName === 'webkit' ? 300 : 100;
    await openBoard(page, onePagerWithLoop());
    await page.evaluate(() => document.fonts.ready);
    const before = await template(page).textContent();
    // Warm the engine with one turn first.
    await cardById(page, 'mechanic-t1').hover({ position: { x: 120, y: 180 } });
    await page.keyboard.press('r');
    await expect(template(page)).not.toHaveText(before!);
    const result = await page.evaluate(async () => {
      const loop = document.querySelector('[data-testid="loop-template"]')!;
      const ring = document.querySelector<HTMLButtonElement>(
        '.react-flow__node[data-id="mechanic-t1"] [aria-label="Turn Cues Right"]',
      )!;
      const was = loop.textContent;
      const start = performance.now();
      ring.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { elapsed: performance.now() - start, changed: loop.textContent !== was };
    });
    expect(result.changed).toBe(true);
    expect(result.elapsed).toBeLessThan(limit);
  },
);
