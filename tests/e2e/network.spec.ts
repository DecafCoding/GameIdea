/**
 * Network test (nfr-targets privacy and security rows): a full session over the board list,
 * a board, every deck, a note, the card test page, both exports and an import sends no
 * request to any address other than the app's own.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from './test';
import { canvasCards, createBoard, drawFromRail, rail } from './board-helpers';
import { exportFile } from './export-helpers';
import { draw, type DeckName } from './helpers';

const APP_ORIGIN = 'http://localhost:4174';
const DECKS: DeckName[] = ['Player Role', 'Goal', 'Conflict', 'Modifier', 'Setting'];

test('network_fullSession_onlyOwnAddress', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));

  // The board list, then New Board.
  await page.goto('/');
  await createBoard(page);
  await page.waitForURL(/#\/board\//);
  const boardUrl = page.url();
  await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();

  // One card of each type, and a note.
  for (const [i, deck] of DECKS.entries()) {
    await drawFromRail(page, deck);
    await expect(canvasCards(page)).toHaveCount(i + 1);
  }
  await rail(page).getByRole('button', { name: 'Add Note' }).click();

  // The card test page.
  await page.goto('/#/card-test');
  await expect(page.getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
  await draw(page, 'Player Role');
  await expect(page.getByTestId('card')).toHaveCount(1);

  // Back to the list, open the board and export both files.
  await page.goto('/#/');
  await expect(page.getByRole('list', { name: 'Saved Boards' })).toBeVisible();
  await page.goto(boardUrl);
  await expect(canvasCards(page)).toHaveCount(DECKS.length);
  await exportFile(page, 'Text File');
  const boardFile = await exportFile(page, 'Board File');
  const buffer = await readFile(await boardFile.path());

  // Import the board file on the list.
  await page.goto('/#/');
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import Board File' }).click();
  await (
    await choosing
  ).setFiles({ name: 'board.gameidea.json', mimeType: 'application/json', buffer });
  await expect(page.getByRole('status')).toContainText('Board imported.');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const outside = urls.filter((url) => {
    const { protocol, origin } = new URL(url);
    return origin !== APP_ORIGIN && protocol !== 'blob:' && protocol !== 'data:';
  });
  expect(outside, `Requests outside ${APP_ORIGIN}:\n${outside.join('\n')}`).toEqual([]);
  expect(urls.some((url) => url.endsWith('.woff2'))).toBe(true);
  expect(urls.some((url) => /\/pools\/\w+\.json$/.test(url))).toBe(true);
});
