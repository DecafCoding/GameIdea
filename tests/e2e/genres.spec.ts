/**
 * Browser tests for deck genres (docs/feature-deck-genres.html): a board with its own genre
 * list per deck draws only those cues from each deck, Cancel and Esc in the New Board dialog
 * create nothing, and old stored boards (Dexie schema 1 and 2) and old board files (format
 * version 1 and 2) come up with their genres in every deck and still draw.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import {
  everyDeck,
  FORMAT_VERSION,
  GENRES,
  type Board,
  type Card,
  type CardType,
  type Genre,
  type PoolCue,
} from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import {
  canvasCards,
  createBoardWithGenres,
  drawFromRail,
  newBoardDialog,
  rail,
  seedOldBoard,
  storedBoards,
} from './board-helpers';

/** The real pool file's cues for a type. */
function poolCues(type: CardType): PoolCue[] {
  const file = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'pools', `${type}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as { cues: PoolCue[] }).cues;
}

/** Checks every cue of every ring is a pool cue sharing 1 of the genres. */
function expectCuesFrom(card: Card, genres: readonly Genre[]) {
  const allowed = new Set(
    poolCues(card.type)
      .filter((cue) => cue.genres.some((g) => genres.includes(g)))
      .map((cue) => cue.text),
  );
  for (const ring of card.rings) {
    for (const cue of ring.cues) {
      expect(allowed.has(cue.text), `${card.type}: ${cue.text}`).toBe(true);
    }
  }
}

/** The fixture board with 1 Player Role as version 1 saved it: no genres, formatVersion 1. */
function version1Board(id: string, name: string): Record<string, unknown> {
  const board: Partial<Board> = { ...fixtureBoard([fixtureCard('role')]), id, name };
  delete board.genres;
  return { ...board, formatVersion: 1 };
}

/** The same board as version 2 saved it: 1 flat genre list, formatVersion 2. */
function version2Board(id: string, name: string, genres: Genre[]): Record<string, unknown> {
  return { ...version1Board(id, name), genres, formatVersion: 2 };
}

const rows = (page: Page) => page.getByRole('list', { name: 'Saved Boards' }).getByRole('listitem');

/** Imports a board file body through the Import Board File button. */
async function importFile(page: Page, body: Record<string, unknown>) {
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import Board File' }).click();
  const chooser = await choosing;
  await chooser.setFiles({
    name: 'Old.gameidea.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(body)),
  });
  await expect(page.getByRole('status')).toHaveText('Board imported.');
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('genres_deckGenres_eachDeckDrawsOnlyItsGenres', async ({ page }) => {
  await page.goto('/');
  await createBoardWithGenres(page, {
    name: 'Deck Mix',
    decks: { role: ['cyberpunk'], setting: ['space-opera'] },
  });
  await page.waitForURL(/#\/board\//);
  await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();

  // The count badge counts every card, in view or not, and is cheap to read.
  let n = 0;
  for (const deck of ['Player Role', 'Setting'] as const) {
    for (let i = 0; i < 3; i++) {
      await drawFromRail(page, deck);
      await expect(page.getByTestId('count-badge')).toHaveText(
        `${++n} card${n === 1 ? '' : 's'} · 0 notes`,
      );
    }
  }
  await expect.poll(async () => (await storedBoards(page))[0]?.cards.length).toBe(6);
  const [board] = await storedBoards(page);
  expect(board!.name).toBe('Deck Mix');
  expect(board!.genres).toEqual({
    ...everyDeck(GENRES),
    role: ['cyberpunk'],
    setting: ['space-opera'],
  });
  for (const card of board!.cards) expectCuesFrom(card, board!.genres[card.type]);
});

test('genres_newBoardDialog_cancelCreatesNothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Board' }).click();
  await newBoardDialog(page).getByRole('button', { name: 'Next' }).click();
  await newBoardDialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(newBoardDialog(page)).toHaveCount(0);
  await expect(rows(page)).toHaveCount(0);
  expect(new URL(page.url()).hash).toMatch(/^(#\/?)?$/);
  await expect(page.getByRole('button', { name: 'New Board' })).toBeFocused();
  expect(await storedBoards(page)).toEqual([]);
});

test('genres_newBoardDialog_escapeCreatesNothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Board' }).click();
  await expect(newBoardDialog(page).getByRole('textbox', { name: 'Board Name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(newBoardDialog(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New Board' })).toBeFocused();
  expect(await storedBoards(page)).toEqual([]);
});

test('genres_version1StoredBoard_opensWithAllGenresInEveryDeckAndDraws', async ({ page }) => {
  // A same-origin page that runs no app code, so the app has not opened the database yet.
  await page.goto('/pools/role.json');
  await seedOldBoard(page, version1Board('old-board', 'Old Board'), 1);
  await page.goto('/#/board/old-board');
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(rail(page).getByRole('button', { name: 'Draw A Setting' })).toBeEnabled();
  await drawFromRail(page, 'Setting');
  await expect(canvasCards(page)).toHaveCount(2);

  await expect.poll(async () => (await storedBoards(page))[0]?.cards.length).toBe(2);
  const [board] = await storedBoards(page);
  expect(board!.formatVersion).toBe(FORMAT_VERSION);
  expect(board!.genres).toEqual(everyDeck(GENRES));
});

test('genres_version2StoredBoard_keepsItsGenresInEveryDeck', async ({ page }) => {
  await page.goto('/pools/role.json');
  await seedOldBoard(page, version2Board('old-board', 'Old Board', ['cyberpunk']), 2);
  await page.goto('/#/board/old-board');
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(rail(page).getByRole('button', { name: 'Draw A Setting' })).toBeEnabled();
  await drawFromRail(page, 'Setting');
  await expect(canvasCards(page)).toHaveCount(2);

  await expect.poll(async () => (await storedBoards(page))[0]?.cards.length).toBe(2);
  const [board] = await storedBoards(page);
  expect(board!.formatVersion).toBe(FORMAT_VERSION);
  expect(board!.genres).toEqual(everyDeck(['cyberpunk']));
  const setting = board!.cards.find((card) => card.type === 'setting');
  expectCuesFrom(setting!, ['cyberpunk']);
});

test('genres_version1BoardFile_importsWithAllGenresInEveryDeck', async ({ page }) => {
  await page.goto('/#/');
  await importFile(page, version1Board('file-id', 'Old File'));
  const [stored] = await storedBoards(page);
  expect(stored!.formatVersion).toBe(FORMAT_VERSION);
  expect(stored!.genres).toEqual(everyDeck(GENRES));

  await rows(page).first().getByRole('link', { name: 'Old File' }).click();
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
  await drawFromRail(page, 'Player Role');
  await expect(canvasCards(page)).toHaveCount(2);
});

test('genres_version2BoardFile_importsWithItsGenresInEveryDeck', async ({ page }) => {
  await page.goto('/#/');
  await importFile(page, version2Board('file-id', 'Old File', ['space-opera']));
  const [stored] = await storedBoards(page);
  expect(stored!.formatVersion).toBe(FORMAT_VERSION);
  expect(stored!.genres).toEqual(everyDeck(['space-opera']));

  await rows(page).first().getByRole('link', { name: 'Old File' }).click();
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
  await drawFromRail(page, 'Player Role');
  await expect(canvasCards(page)).toHaveCount(2);
});
