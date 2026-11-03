/**
 * Browser tests for the Settings dialog (design 9.11): it opens from the rail with its rows
 * and the package.json version, a change applies at once and is not an undo step, Done and
 * × close it, and each key in the Keyboard list does what the list says.
 */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { combinedCard, fixtureBoard } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard, rail } from './board-helpers';

const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' });

async function openSettings(page: Page) {
  await rail(page).getByRole('button', { name: 'Settings' }).click();
  await expect(dialog(page)).toBeVisible();
}

test('settings_openFromRail_showsRowsAndVersion', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  const d = dialog(page);
  await expect(d.getByRole('radiogroup', { name: 'Mode' })).toBeVisible();
  await expect(d.getByRole('radiogroup', { name: 'Theme Color' })).toBeVisible();
  await expect(d.getByRole('switch', { name: 'Snap To Grid' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(d.getByRole('heading', { name: 'Keyboard' })).toBeVisible();
  await expect(d).toContainText(`GameIdea ${VERSION} · No account. No data leaves this computer.`);
  await expect(d.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
});

test('settings_lightGreen_appliesAtOnceAndNotInUndo', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  await dialog(page).getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(page.locator('header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await dialog(page).getByRole('radio', { name: 'Green' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');
  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  const stored = await page.evaluate(() => localStorage.getItem('gameidea.settings'));
  expect(JSON.parse(stored!)).toEqual({ version: 1, mode: 'light', accent: 'green', snap: true });
});

test('settings_doneAndClose_closeDialog', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(dialog(page)).toBeHidden();
  await openSettings(page);
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(dialog(page)).toBeHidden();
  await openSettings(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('settings_keyboardList_eachKeyDoesWhatItSays', async ({ page }) => {
  await openBoard(page, fixtureBoard([combinedCard('role', { x: 96, y: 96 })]));
  await openSettings(page);
  const keys = await dialog(page).locator('dt').allTextContents();
  expect(keys).toEqual(['R', 'Shift+R', 'Ctrl+Z', 'Ctrl+Shift+Z']);
  const does = await dialog(page).locator('dd').allTextContents();
  expect(does).toEqual([
    'Turn the outer ring, or the only ring, one step',
    'Turn the inner ring of a combined card',
    'Undo',
    'Redo',
  ]);
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  const card = cardById(page, 'role-1');
  const active = card.getByTestId('active-cue');
  await expect(active).toHaveText('exiled navigator');
  await card.click({ position: { x: 30, y: 30 } });
  const canvas = await boxOf(page.getByTestId('canvas'));
  await page.mouse.move(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);

  // R: the outer ring (the nouns) turns one step.
  await page.keyboard.press('r');
  await expect(active).toHaveText('exiled captain');
  // Shift+R: the inner ring (the adjectives) turns one step.
  await page.keyboard.press('Shift+R');
  await expect(active).toHaveText('salvage captain');
  // Ctrl+Z undoes the last turn; Ctrl+Shift+Z redoes it.
  await page.keyboard.press('Control+z');
  await expect(active).toHaveText('exiled captain');
  await page.keyboard.press('Control+Shift+z');
  await expect(active).toHaveText('salvage captain');
});
