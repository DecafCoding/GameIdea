/**
 * Browser tests for Import Board File (design 9.8 and 9.10): an exported board file imports
 * again as a new board with no data lost, a free name is kept, and a bad file shows the
 * banner and changes nothing.
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board } from '@/shared/model';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
  roundTripBoard,
  secondModifier,
} from '@/test/fixtures/boards';
import { canvasCards, openBoard, storedBoards } from './board-helpers';
import { exportFile } from './export-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const BAD_IMPORT_TEXT = 'This file is not a GameIdea board file. Nothing changed.';

/** A combined Player Role stack with a Modifier tucked under it, a Setting and 2 notes. */
function fullBoard(): Board {
  const [role, goal, conflict] = fixtureStack(200, 200);
  const combined = combinedCard('role', {
    id: role!.id,
    x: role!.x,
    y: role!.y,
    z: role!.z,
  });
  const devout = secondModifier({ x: 200, y: 200 + 56, z: 4, tuckedUnder: combined.id });
  // The Modifier sorts first among the children, so the others sit one step lower.
  const stack = [
    combined,
    devout,
    { ...goal!, y: 200 + 2 * 56 },
    { ...conflict!, y: 200 + 3 * 56 },
  ];
  return {
    ...fixtureBoard(
      [...stack, fixtureCard('setting', { x: 700, y: 200, z: 5 })],
      [
        fixtureNote({ x: 200, y: 700, text: 'The fleet left without her.' }),
        fixtureNote({ id: 'note-2', x: 600, y: 700, text: 'She has one ship.\nNo map.' }),
      ],
    ),
    id: 'full-board',
    name: 'Salvage Run',
    view: { panX: -40, panY: 30, zoom: 0.9 },
  };
}

const rows = (page: Page) => page.getByRole('list', { name: 'Saved Boards' }).getByRole('listitem');
// The header's button; the "No Boards Yet" box repeats it on an empty list.
const importButton = (page: Page) =>
  page.getByRole('button', { name: 'Import Board File' }).first();

/** Chooses a file through the visible Import Board File button. */
async function importThrough(
  page: Page,
  button: ReturnType<typeof importButton>,
  file: { name: string; buffer: Buffer },
) {
  const choosing = page.waitForEvent('filechooser');
  await button.click();
  const chooser = await choosing;
  await chooser.setFiles({ ...file, mimeType: 'application/json' });
}

/** The record without the fields an import changes. */
function kept(board: Board) {
  return { ...board, id: '', name: '', updatedAt: '' };
}

test('import_exportedBoardFile_roundTripsAsNewBoard', async ({ page }) => {
  await openBoard(page, fullBoard());
  const download = await exportFile(page, 'Board File');
  const buffer = await readFile(await download.path());
  const exported = JSON.parse(buffer.toString('utf8')) as Board;

  await page.goto('/#/');
  await expect(rows(page)).toHaveCount(1);
  await importThrough(page, importButton(page), { name: 'Salvage Run.gameidea.json', buffer });

  await expect(page.getByRole('status')).toHaveText(
    'Board imported. The name was taken, so "(imported)" was added.',
  );
  const first = rows(page).first();
  await expect(first).toHaveAttribute('data-highlighted', 'true');
  await expect(first.getByRole('link')).toHaveText('Salvage Run (imported)');
  await expect(first).toContainText('Imported just now ·');

  const stored = await storedBoards(page);
  expect(stored).toHaveLength(2);
  const original = stored.find((board) => board.id === 'full-board')!;
  const imported = stored.find((board) => board.id !== 'full-board')!;
  expect(original).toEqual(exported);
  expect(imported.name).toBe('Salvage Run (imported)');
  expect(kept(imported)).toEqual(kept(exported));
});

test('import_richBoard_roundTripsEveryField', async ({ page }) => {
  const board = roundTripBoard();
  await openBoard(page, board);
  const sentence = (await page.getByTestId('hook-sentence').textContent())!.trim();
  expect(sentence).not.toBe('');
  const download = await exportFile(page, 'Board File');
  const buffer = await readFile(await download.path());

  await page.goto('/#/');
  await importThrough(page, importButton(page), { name: 'Round Trip.gameidea.json', buffer });
  await expect(page.getByRole('status')).toContainText('Board imported.');

  const stored = await storedBoards(page);
  expect(stored).toHaveLength(2);
  const original = stored.find((b) => b.id === board.id)!;
  const imported = stored.find((b) => b.id !== board.id)!;
  expect(kept(original)).toEqual(kept(board));
  expect(kept(imported)).toEqual(kept(original));

  await page.goto(`/#/board/${encodeURIComponent(imported.id)}`);
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
  await expect(page.getByTestId('hook-sentence')).toHaveText(sentence);
});

test('import_freeName_keepsName', async ({ page }) => {
  await page.goto('/#/');
  const board = { ...fixtureBoard([fixtureCard('role')]), name: 'Drift' };
  await importThrough(page, importButton(page), {
    name: 'Drift.gameidea.json',
    buffer: Buffer.from(JSON.stringify(board)),
  });
  await expect(page.getByRole('status')).toHaveText('Board imported.');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().getByRole('link')).toHaveText('Drift');
});

test('import_badFile_bannerAndNothingChanged', async ({ page }) => {
  await openBoard(page, fullBoard());
  await page.goto('/#/');
  await expect(rows(page)).toHaveCount(1);
  const before = await storedBoards(page);

  await importThrough(page, importButton(page), {
    name: 'photo.json',
    buffer: Buffer.from('not a board'),
  });
  await expect(page.getByRole('alert')).toContainText(BAD_IMPORT_TEXT);
  expect(await storedBoards(page)).toEqual(before);
  await expect(rows(page)).toHaveCount(1);

  const good = { ...fixtureBoard([]), name: 'Drift' };
  await importThrough(page, page.getByRole('button', { name: 'Choose Another File' }), {
    name: 'Drift.gameidea.json',
    buffer: Buffer.from(JSON.stringify(good)),
  });
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(rows(page)).toHaveCount(2);
});

test('import_importedBoard_opensAndShowsCards', async ({ page }) => {
  const board = fullBoard();
  await page.goto('/#/');
  await importThrough(page, importButton(page), {
    name: 'Salvage Run.gameidea.json',
    buffer: Buffer.from(JSON.stringify(board)),
  });
  await rows(page).first().getByRole('link', { name: 'Salvage Run' }).click();
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
  await expect(canvasCards(page)).toHaveCount(board.cards.length);
});
