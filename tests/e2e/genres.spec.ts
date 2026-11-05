/**
 * Genres browser tests (design 8.2, 9.10 and 9.11): the Settings Genres tab, the rail Edit
 * Genres buttons, no rail Genres button, persistence across reload, genre changes kept out of undo,
 * the last genre guard, and the genre filter on draws with the real pools.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { canvasCards, drawFromRail, openBoard, rail, storedBoards } from './board-helpers';
import type { Board, PoolCue } from '@/shared/model';

/** The Genres tab scope line (design 9.10, verbatim). */
const GENRES_SCOPE_TEXT =
  'These genres apply to this board only. Pick genres at the top. Each genre you pick shows on the 4 genre decks below, already on. Turn one off to keep it out of that deck. A change applies to the next draw only. Cards on the board keep their cues. The other 7 decks are not filtered by genres.';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function settingsDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Settings' });
}

/** The Genres tab body inside the Settings dialog. */
function panel(page: Page) {
  return settingsDialog(page).getByRole('tabpanel');
}

function topRow(page: Page) {
  return panel(page).getByRole('region', { name: 'All 4 Decks' });
}

/** The Edit Genres button beside a genre deck button. */
function genreButton(page: Page, deck: string) {
  return rail(page).getByRole('button', { name: new RegExp(`^Edit ${deck} Genres, `) });
}

/** Opens Settings from the rail and selects the Genres tab. */
async function openGenresTab(page: Page) {
  await rail(page).getByRole('button', { name: 'Settings', exact: true }).click();
  await settingsDialog(page).getByRole('tab', { name: 'Genres' }).click();
  await expect(panel(page)).toBeVisible();
  await expect(topRow(page)).toBeVisible();
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

test('genres_newBoard_dramaIconsAndNoRailGenresButton', async ({ page }) => {
  await openBoard(page);
  for (const deck of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
    const button = genreButton(page, deck);
    await expect(button).toHaveAccessibleName(`Edit ${deck} Genres, all genres on`);
    await expect(button).toHaveAttribute('title', 'Edit Genres');
    await expect(button.locator('[data-icon="drama"]')).toHaveCount(1);
  }
  await expect(rail(page).getByRole('button', { name: /^Edit (Mood|Twist) Genres/ })).toHaveCount(
    0,
  );
  await expect(rail(page).getByRole('button', { name: 'Genres', exact: true })).toHaveCount(0);
  await expect(rail(page).getByRole('heading', { name: 'Genres' })).toHaveCount(0);
});

test('genres_editGenresButton_opensGenresTab', async ({ page }) => {
  await openBoard(page);
  await genreButton(page, 'Resource').click();
  await expect(settingsDialog(page).getByRole('tab', { name: 'Genres' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(topRow(page)).toBeVisible();
});

test('genres_tab_turnOffTopChip_updatesCounts', async ({ page }) => {
  await openBoard(page);
  await openGenresTab(page);
  await expect(topRow(page).getByRole('button')).toHaveCount(22); // 21 chips and All On
  for (const deck of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
    await expect(panel(page).getByRole('group', { name: deck })).toBeVisible();
  }
  await topRow(page).getByRole('button', { name: 'Roguelike', exact: true }).click();
  await settingsDialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(genreButton(page, 'Mechanic')).toHaveText('20');
  await expect(genreButton(page, 'Resource')).toHaveText('20');
  await expect(genreButton(page, 'Mechanic')).toHaveAccessibleName(
    'Edit Mechanic Genres, 20 genres on',
  );
  for (const deck of ['Progression', 'Constraint']) {
    await expect(genreButton(page, deck)).toHaveText('20');
    await expect(genreButton(page, deck)).toHaveAccessibleName(`Edit ${deck} Genres, 20 genres on`);
  }
  await expect(rail(page).getByRole('button', { name: /^Edit (Mood|Twist) Genres/ })).toHaveCount(
    0,
  );
});

test('genres_settingsGenresTab_showsScopeLineAndFooter', async ({ page }) => {
  await openBoard(page);
  await openGenresTab(page);
  const dialog = settingsDialog(page);
  await expect(dialog.getByText(GENRES_SCOPE_TEXT, { exact: true })).toBeVisible();
  await expect(
    dialog.getByText('Each deck keeps at least 1 genre.', { exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toContainText('Generic');
});

test('genres_deckRow_narrowsOnlyThatDecksCount', async ({ page }) => {
  await openBoard(page);
  await openGenresTab(page);
  await panel(page)
    .getByRole('group', { name: 'Constraint' })
    .getByRole('button', { name: 'Roguelike', exact: true })
    .click();
  await settingsDialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(genreButton(page, 'Constraint')).toHaveText('20');
  for (const deck of ['Mechanic', 'Resource', 'Progression']) {
    await expect(genreButton(page, deck)).toHaveAccessibleName(/all genres on$/);
  }
});

test('genres_change_savesAndSurvivesReload', async ({ page }) => {
  await openBoard(page);
  await openGenresTab(page);
  await panel(page)
    .getByRole('group', { name: 'Mechanic' })
    .getByRole('button', { name: 'Horror', exact: true })
    .click();
  await settingsDialog(page).getByRole('button', { name: 'Close' }).click();
  const board = await storedBoardWhen(page, (b) => b.genres.mechanic.length === 20);
  expect(board.genres.mechanic).not.toContain('horror');
  expect(board.genres.resource).toHaveLength(21);
  await page.reload();
  await expect(genreButton(page, 'Mechanic')).toHaveText('20');
  await expect(genreButton(page, 'Resource')).toHaveAccessibleName(/all genres on$/);
});

test('genres_change_notInUndo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);
  await drawFromRail(page, 'Player Role');
  await expect(canvasCards(page)).toHaveCount(1);
  await openGenresTab(page);
  await topRow(page).getByRole('button', { name: 'Puzzle', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(genreButton(page, 'Mechanic')).toHaveText('20');
  await page.keyboard.press('Control+z');
  await expect(canvasCards(page)).toHaveCount(0);
  await expect(genreButton(page, 'Mechanic')).toHaveText('20');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
});

test('genres_lastGenre_cannotTurnOff', async ({ page }) => {
  await openBoard(page);
  await openGenresTab(page);
  const row = panel(page).getByRole('group', { name: 'Mechanic' });
  const chips = row.getByRole('button');
  await expect(chips).toHaveCount(21);
  for (let i = 0; i < 20; i++) await chips.nth(i).click();
  await expect(row.getByRole('button', { pressed: true })).toHaveCount(1);
  const last = row.getByRole('button', { pressed: true });
  await expect(last).toBeDisabled();
  await expect(last).toHaveAttribute('title', 'Each deck keeps at least 1 genre.');
  await expect(settingsDialog(page)).toContainText('Each deck keeps at least 1 genre.');
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

  await openGenresTab(page);
  const chips = topRow(page).getByRole('button', { pressed: true });
  await expect(chips).toHaveCount(21);
  for (const name of await chips.allTextContents()) {
    if (name === 'Metroidvania') continue;
    await topRow(page).getByRole('button', { name, exact: true }).click();
  }
  await expect(chips).toHaveCount(1);
  await settingsDialog(page).getByRole('button', { name: 'Done' }).click();
  await storedBoardWhen(page, (b) => b.genres.mechanic.join() === 'metroidvania');

  await page.reload();
  await expect(genreButton(page, 'Mechanic')).toHaveText('1');
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
