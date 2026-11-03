/**
 * Genres browser tests (design 8.2 and 9.10): the Genres panel, the genre count pills and
 * the Genres line, persistence across reload, genre changes kept out of undo, the last
 * genre guard, and the genre filter on draws with the real pools.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { canvasCards, drawFromRail, openBoard, rail, storedBoards } from './board-helpers';
import type { Board, PoolCue } from '@/shared/model';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function genresButton(page: Page) {
  return rail(page).getByRole('button', { name: 'Genres', exact: true });
}

function panel(page: Page) {
  return page.getByRole('dialog', { name: 'Genres' });
}

function topRow(page: Page) {
  return panel(page).getByRole('region', { name: 'All 4 Decks' });
}

function pill(page: Page, deck: string) {
  return rail(page)
    .getByRole('button', { name: `Draw A ${deck}`, exact: true })
    .getByRole('img', { name: /genres? on$/ });
}

async function openPanel(page: Page) {
  await genresButton(page).click();
  await expect(panel(page)).toBeVisible();
}

/** The one stored board, once the predicate holds for it. */
async function storedBoardWhen(page: Page, ok: (board: Board) => boolean): Promise<Board> {
  let found: Board | undefined;
  await expect
    .poll(async () => {
      const [board] = await storedBoards(page);
      found = board && ok(board) ? board : undefined;
      return found !== undefined;
    })
    .toBe(true);
  return found!;
}

const cueTexts = (board: Board, id: string) =>
  board.cards.find((c) => c.id === id)!.rings.flatMap((r) => r.cues.map((c) => c.text));

test('genres_newBoard_noPillsAndAllGenresLine', async ({ page }) => {
  await openBoard(page);
  await expect(rail(page).getByRole('img', { name: /genres? on$/ })).toHaveCount(0);
  await expect(genresButton(page)).toContainText('All genres');
});

test('genres_panel_turnOffTopChip_updatesPillsAndLine', async ({ page }) => {
  await openBoard(page);
  await openPanel(page);
  await expect(topRow(page).getByRole('button')).toHaveCount(22); // 21 chips and All On
  for (const deck of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
    await expect(panel(page).getByRole('group', { name: deck })).toBeVisible();
  }
  await topRow(page).getByRole('button', { name: 'Roguelike', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Done' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page, 'Mechanic')).toHaveText('20');
  await expect(pill(page, 'Resource')).toHaveText('20');
  await expect(pill(page, 'Mechanic')).toHaveAccessibleName('20 genres on');
  for (const deck of ['Progression', 'Constraint']) {
    await expect(pill(page, deck)).toHaveText('20');
    await expect(pill(page, deck)).toHaveAccessibleName('20 genres on');
  }
  for (const deck of ['Mood', 'Twist']) {
    await expect(
      rail(page)
        .getByRole('button', { name: `Draw A ${deck}`, exact: true })
        .getByRole('img'),
    ).toHaveCount(0);
  }
  await expect(genresButton(page)).toContainText('20 genres');
});

test('genres_deckRow_narrowsOnlyThatDecksPill', async ({ page }) => {
  await openBoard(page);
  await openPanel(page);
  await panel(page)
    .getByRole('group', { name: 'Constraint' })
    .getByRole('button', { name: 'Roguelike', exact: true })
    .click();
  await panel(page).getByRole('button', { name: 'Done' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page, 'Constraint')).toHaveText('20');
  for (const deck of ['Mechanic', 'Resource', 'Progression']) {
    await expect(pill(page, deck)).toHaveCount(0);
  }
  // The union of the 4 decks still has all 21 genres.
  await expect(genresButton(page)).toContainText('All genres');
});

test('genres_change_savesAndSurvivesReload', async ({ page }) => {
  await openBoard(page);
  await openPanel(page);
  await panel(page)
    .getByRole('group', { name: 'Mechanic' })
    .getByRole('button', { name: 'Horror', exact: true })
    .click();
  await panel(page).getByRole('button', { name: 'Close' }).click();
  const board = await storedBoardWhen(page, (b) => b.genres.mechanic.length === 20);
  expect(board.genres.mechanic).not.toContain('horror');
  expect(board.genres.resource).toHaveLength(21);
  await page.reload();
  await expect(pill(page, 'Mechanic')).toHaveText('20');
  await expect(pill(page, 'Resource')).toHaveCount(0);
  // The union of the 4 decks still has every genre.
  await expect(genresButton(page)).toContainText('All genres');
});

test('genres_change_notInUndo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);
  await drawFromRail(page, 'Player Role');
  await expect(canvasCards(page)).toHaveCount(1);
  await openPanel(page);
  await topRow(page).getByRole('button', { name: 'Puzzle', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page, 'Mechanic')).toHaveText('20');
  await page.keyboard.press('Control+z');
  await expect(canvasCards(page)).toHaveCount(0);
  await expect(pill(page, 'Mechanic')).toHaveText('20');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
});

test('genres_lastGenre_cannotTurnOff', async ({ page }) => {
  await openBoard(page);
  await openPanel(page);
  const row = panel(page).getByRole('group', { name: 'Mechanic' });
  const chips = row.getByRole('button');
  await expect(chips).toHaveCount(21);
  for (let i = 0; i < 20; i++) await chips.nth(i).click();
  await expect(row.getByRole('button', { pressed: true })).toHaveCount(1);
  const last = row.getByRole('button', { pressed: true });
  await expect(last).toBeDisabled();
  await expect(last).toHaveAttribute('title', 'Each deck keeps at least 1 genre.');
  await expect(panel(page)).toContainText('Each deck keeps at least 1 genre.');
  await expect(topRow(page).getByRole('button', { name: 'Rhythm & Arcade' })).toBeDisabled();
});

test('genres_realPools_drawUsesOnlyPickedGenre', async ({ page, context }) => {
  test.slow();
  await context.unroute('**/pools/*.json');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pool = JSON.parse(readFileSync(join(ROOT, 'public', 'pools', 'mechanic.json'), 'utf8')) as {
    cues: PoolCue[];
  };
  const allowed = new Set(
    pool.cues.filter((c) => c.genres?.includes('metroidvania')).map((c) => c.text),
  );
  expect(allowed.size).toBeGreaterThanOrEqual(10);

  await openBoard(page);
  await drawFromRail(page, 'Mechanic');
  const before = await storedBoardWhen(page, (b) => b.cards.length === 1);
  const firstId = before.cards[0]!.id;
  const firstCues = cueTexts(before, firstId);

  await openPanel(page);
  const chips = topRow(page).getByRole('button', { pressed: true });
  await expect(chips).toHaveCount(21);
  for (const name of await chips.allTextContents()) {
    if (name === 'Metroidvania') continue;
    await topRow(page).getByRole('button', { name, exact: true }).click();
  }
  await expect(chips).toHaveCount(1);
  await panel(page).getByRole('button', { name: 'Done' }).click();
  await storedBoardWhen(page, (b) => b.genres.mechanic.join() === 'metroidvania');

  await page.reload();
  await expect(pill(page, 'Mechanic')).toHaveText('1');
  for (let i = 0; i < 5; i++) {
    await drawFromRail(page, 'Mechanic');
    const board = await storedBoardWhen(page, (b) => b.cards.length === 2);
    const drawn = board.cards.find((c) => c.id !== firstId)!;
    for (const text of cueTexts(board, drawn.id)) expect(allowed).toContain(text);
    expect(cueTexts(board, firstId)).toEqual(firstCues);
    // Undo the draw so the next card lands alone; the genres stay.
    await page.keyboard.press('Control+z');
    await storedBoardWhen(page, (b) => b.cards.length === 1);
  }
  const last = await storedBoardWhen(page, (b) => b.cards.length === 1);
  expect(last.genres.mechanic).toEqual(['metroidvania']);
});
