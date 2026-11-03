/**
 * Browser tests for the Export menu (design 9.9): the text file and the board file download
 * at once with the right names and contents, and Esc closes the menu.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openBoard, storedBoards } from './board-helpers';
import { exportButton, exportFile, salvageRun } from './export-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/**
 * The downloaded file name with the engine's own changes undone: WebKit on Linux replaces
 * spaces in a download name with underscores, though the app names the file with spaces.
 */
function downloadedName(download: { suggestedFilename(): string }, browserName: string) {
  const name = download.suggestedFilename();
  return browserName === 'webkit' ? name.replaceAll('_', ' ') : name;
}

test('export_textFile_downloadsPlainWords', async ({ page, browserName }) => {
  await openBoard(page, salvageRun());
  const download = await exportFile(page, 'Text File');
  expect(downloadedName(download, browserName)).toBe('Salvage Run.txt');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toBe(
    'Salvage Run\n\nCards\n\n' +
      'Character: exiled navigator\n' +
      '  Motivation: wants to go home\n' +
      '    Conflict: but the ship is dying\n\n' +
      'Notes\n\nNote\nThe fleet left without her.\n',
  );
  await expect(page.getByRole('menu')).toBeHidden();
});

test('export_boardFile_matchesStoredRecord', async ({ page, browserName }) => {
  await openBoard(page, salvageRun());
  const download = await exportFile(page, 'Board File');
  expect(downloadedName(download, browserName)).toBe('Salvage Run.gameidea.json');
  const parsed: unknown = JSON.parse(await readFile(await download.path(), 'utf8'));
  const stored = (await storedBoards(page)).find((board) => board.id === 'salvage-run');
  expect(parsed).toEqual(stored);
});

test('export_menu_escapeCloses', async ({ page }) => {
  await openBoard(page, salvageRun());
  await exportButton(page).click();
  await expect(page.getByRole('menu', { name: 'Export' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(exportButton(page)).toBeFocused();
});
