/**
 * Browser tests for the Questions panel (docs/feature-questions-panel.html, design 9.17) on
 * the fixture question pool of 3 questions: the panel starts 264 px below the Core Loop
 * card's top on One-Pager boards only, Save Answer moves the question into the list and never shows
 * it again, Next Question is view state only, edit and delete are 1 undo step each, answers
 * survive a reload and a board file round trip, the panel moves on its own and never
 * follows the Core Loop card,
 * the all-answered state, a blocked question pool, and the text file section.
 */
import { readFile } from 'node:fs/promises';
import type { Page, Route } from '@playwright/test';
import { expect, test } from './test';
import type { Board } from '@/shared/model';
import { onePagerWithAnswers } from '@/test/fixtures/boards';
import { boxOf, drawFromRail, openBoard, storedBoards } from './board-helpers';
import { exportFile } from './export-helpers';

const FIXTURE_QUESTIONS = ['Who is the player?', 'What makes it fun?', 'What could go wrong?'];

const panel = (page: Page) => page.getByTestId('questions-panel');
const current = (page: Page) => page.getByTestId('current-question');
const field = (page: Page) => page.getByTestId('answer-field');
const list = (page: Page) => page.getByTestId('answer-list');
const items = (page: Page) => page.getByTestId('answer-item');
const loopCard = (page: Page) => page.getByTestId('loop-card');
const nextButton = (page: Page) => panel(page).getByRole('button', { name: 'Next Question' });
const saveButton = (page: Page) => panel(page).getByRole('button', { name: 'Save Answer' });
const undoButton = (page: Page) => page.getByRole('button', { name: 'Undo' });
const listField = (page: Page, id: string) =>
  list(page).locator(`[data-answer-id="${id}"]`).getByRole('textbox', { name: 'Answer' });

async function storedBoard(page: Page, id?: string): Promise<Board> {
  const boards = await storedBoards(page);
  if (id) return boards.find((b) => b.id === id)!;
  expect(boards).toHaveLength(1);
  return boards[0]!;
}

/** Clicks the empty canvas left of the Hook Card (blurs a field). */
async function clickEmptyCanvas(page: Page) {
  const box = await boxOf(page.getByTestId('canvas'));
  await page.mouse.click(box.x + 30, box.y + 320);
}

/** Types an answer to the current question and saves it; returns the question. */
async function answerCurrent(page: Page, text: string): Promise<string> {
  const question = (await current(page).textContent())!;
  await field(page).fill(text);
  await saveButton(page).click();
  return question;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('questions_onePager_panelStartsBelowLoopCard', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(panel(page)).toHaveCount(1);
  await expect(panel(page)).toBeVisible();
  await expect(current(page)).toBeVisible();
  const loop = await boxOf(loopCard(page));
  const box = await boxOf(panel(page));
  const zoom = loop.width / 240;
  expect(Math.abs(box.x - loop.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y - (loop.y + 264 * zoom))).toBeLessThanOrEqual(1);
  expect(Math.abs(box.width - 240 * zoom)).toBeLessThanOrEqual(1);

  await openBoard(page);
  await expect(page.locator('.react-flow__node [data-card]').first()).toHaveCount(0);
  await expect(panel(page)).toHaveCount(0);
});

test('questions_saveAnswer_movesToListAndNeverShowsAgain', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(saveButton(page)).toBeDisabled();
  const question = await answerCurrent(page, '  A night owl.  ');
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toContainText(question);
  await expect(listField(page, (await storedBoardAnswerId(page))!)).toHaveValue('A night owl.');
  await expect(page.getByTestId('questions-count')).toHaveText('1 Answered');
  await expect(field(page)).toHaveValue('');
  await expect(current(page)).not.toHaveText(question);
  expect((await storedBoard(page)).questions).toEqual([
    expect.objectContaining({ question, answer: 'A night owl.' }),
  ]);
  for (let i = 0; i < 4; i++) {
    await nextButton(page).click();
    await expect(current(page)).not.toHaveText(question);
  }
  await clickEmptyCanvas(page);
  await page.keyboard.press('Control+z');
  await expect(items(page)).toHaveCount(0);
  await expect.poll(async () => 'questions' in (await storedBoard(page))).toBe(false);
});

async function storedBoardAnswerId(page: Page): Promise<string | undefined> {
  let id: string | undefined;
  await expect
    .poll(async () => {
      id = (await storedBoard(page)).questions?.[0]?.id;
      return id !== undefined;
    })
    .toBe(true);
  return id;
}

test('questions_nextQuestion_noUndoStepNoSave', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(current(page)).toBeVisible();
  const before = await storedBoard(page);
  await expect(undoButton(page)).toBeDisabled();
  const first = (await current(page).textContent())!;
  await nextButton(page).click();
  await expect(current(page)).not.toHaveText(first);
  expect(FIXTURE_QUESTIONS).toContain(await current(page).textContent());
  await expect(undoButton(page)).toBeDisabled();
  expect((await storedBoard(page)).updatedAt).toBe(before.updatedAt);
});

test('questions_editAndDelete_eachOneUndoStep', async ({ page }) => {
  const board = onePagerWithAnswers();
  await openBoard(page, board);
  await expect(items(page)).toHaveCount(2);
  const owl = listField(page, 'answer-1');
  await owl.click();
  await owl.fill('An early bird.');
  await clickEmptyCanvas(page);
  await expect
    .poll(async () => (await storedBoard(page, board.id)).questions?.[1]?.answer)
    .toBe('An early bird.');
  await page.keyboard.press('Control+z');
  await expect(owl).toHaveValue('A night owl.');
  await expect
    .poll(async () => (await storedBoard(page, board.id)).questions?.[1]?.answer)
    .toBe('A night owl.');

  await list(page)
    .locator('[data-answer-id="answer-2"]')
    .getByRole('button', { name: 'Delete Answer' })
    .click();
  await expect(items(page)).toHaveCount(1);
  await expect.poll(async () => (await storedBoard(page, board.id)).questions?.length).toBe(1);
  await page.keyboard.press('Control+z');
  await expect(items(page)).toHaveCount(2);
  await expect
    .poll(async () => (await storedBoard(page, board.id)).questions?.map((a) => a.id))
    .toEqual(['answer-2', 'answer-1']);
});

test('questions_reload_answersStayNewQuestionShows', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  const question = await answerCurrent(page, 'Someone who likes the dark.');
  await storedBoardAnswerId(page);
  await page.reload();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toContainText(question);
  await expect(current(page)).toBeVisible();
  await expect(current(page)).not.toHaveText(question);
});

test('questions_dragLoopCard_panelStays', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(panel(page)).toBeVisible();
  const before = await boxOf(panel(page));
  const loop = await boxOf(loopCard(page));
  const x = loop.x + 30;
  const y = loop.y + 16;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 48, { steps: 12 });
  // The panel moves on its own (user 2026-11-05): it stays put while the card moves.
  const during = await boxOf(panel(page));
  expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(during.y - before.y)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect
    .poll(async () => (await storedBoard(page)).cards.find((c) => c.type === 'loop')!.x)
    .not.toBe(624);
  const after = await boxOf(panel(page));
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect((await storedBoard(page)).questionsPos).toEqual({ x: 624, y: 360 });
});

test('questions_dragPanel_movesAloneOneUndoStep', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  await expect(panel(page)).toBeVisible();
  const before = await boxOf(panel(page));
  // Grab the header, away from the field and the buttons.
  await page.mouse.move(before.x + 150, before.y + 26);
  await page.mouse.down();
  await page.mouse.move(before.x + 150 + 240, before.y + 26 + 120, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await storedBoard(page)).questionsPos).toBeDefined();
  const pos = (await storedBoard(page)).questionsPos!;
  // Snap is on by default: the drop lands on the 24 px grid.
  expect(pos.x % 24).toBe(0);
  expect(pos.y % 24).toBe(0);
  expect(Math.abs(pos.x - (624 + 240))).toBeLessThanOrEqual(12);
  expect(Math.abs(pos.y - (360 + 120))).toBeLessThanOrEqual(12);
  // The Core Loop card did not move.
  const loop = (await storedBoard(page)).cards.find((c) => c.type === 'loop')!;
  expect({ x: loop.x, y: loop.y }).toEqual({ x: 624, y: 96 });
  // The field still takes typing after the move.
  await field(page).fill('Still works.');
  await expect(saveButton(page)).toBeEnabled();
  await field(page).fill('');
  await undoButton(page).click();
  await expect.poll(async () => (await storedBoard(page)).questionsPos).toBeUndefined();
});

test('questions_allAnswered_messageThenDeleteBringsBack', async ({ page }) => {
  await openBoard(page, undefined, 'One-Pager');
  const answered: string[] = [];
  for (let i = 0; i < 3; i++) answered.push(await answerCurrent(page, `Answer ${i + 1}.`));
  expect(new Set(answered)).toEqual(new Set(FIXTURE_QUESTIONS));
  await expect(panel(page)).toContainText(
    'You answered every question. Delete an answer to see its question again.',
  );
  await expect(field(page)).toHaveCount(0);
  await expect(nextButton(page)).toHaveCount(0);
  await expect(page.getByTestId('questions-count')).toHaveText('3 Answered');

  const last = items(page).first();
  const freed = (await last.locator('p').first().textContent())!;
  await last.getByRole('button', { name: 'Delete Answer' }).click();
  await expect(current(page)).toHaveText(freed);
});

test('questions_poolBlocked_errorRetryListWorksDecksWork', async ({ page }) => {
  const block = (route: Route) => route.abort();
  await page.route('**/pools/question.json', block);
  const board = onePagerWithAnswers();
  await openBoard(page, board);
  await expect(panel(page)).toContainText(
    'The questions did not load. Your saved answers still work.',
  );
  await expect(field(page)).toHaveCount(0);
  const owl = listField(page, 'answer-1');
  await owl.click();
  await owl.fill('A lark.');
  await clickEmptyCanvas(page);
  await expect
    .poll(async () => (await storedBoard(page, board.id)).questions?.[1]?.answer)
    .toBe('A lark.');

  await drawFromRail(page, 'Goal');
  await expect(page.locator('.react-flow__node [data-card][data-type="goal"]')).toHaveCount(1);

  await page.unroute('**/pools/question.json', block);
  await panel(page).getByRole('button', { name: 'Retry' }).click();
  await expect(current(page)).toHaveText('What could go wrong?');
});

test('questions_textFile_sectionAfterCoreLoop', async ({ page }) => {
  await openBoard(page, onePagerWithAnswers());
  await expect(items(page)).toHaveCount(2);
  const download = await exportFile(page, 'Text File');
  const text = await readFile(await download.path(), 'utf8');
  const loopAt = text.indexOf('\nCore Loop\n\n');
  const questionsAt = text.indexOf('\nQuestions\n\n');
  const detailsAt = text.indexOf('\nDetails\n\n');
  expect(loopAt).toBeGreaterThan(-1);
  expect(questionsAt).toBeGreaterThan(loopAt);
  expect(detailsAt).toBeGreaterThan(questionsAt);
  expect(text.slice(questionsAt, detailsAt)).toBe(
    '\nQuestions\n\nWhat makes it fun?\nChasing the light.\n\nWho is the player?\nA night owl.\n',
  );
});

test('questions_boardFileExportImport_keepsAnswers', async ({ page }) => {
  const board = onePagerWithAnswers();
  await openBoard(page, board);
  const download = await exportFile(page, 'Board File');
  const buffer = await readFile(await download.path());
  await page.goto('/#/');
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import Board File' }).first().click();
  const chooser = await choosing;
  await chooser.setFiles({ name: 'One Pager.gameidea.json', buffer, mimeType: 'application/json' });
  await expect(page.getByRole('status')).toContainText('Board imported.');
  const imported = (await storedBoards(page)).find((b) => b.id !== board.id)!;
  expect(imported.questions).toEqual(board.questions);
  await page.goto(`/#/board/${encodeURIComponent(imported.id)}`);
  await expect(items(page)).toHaveCount(2);
});
