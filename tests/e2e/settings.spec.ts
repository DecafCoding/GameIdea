/**
 * Browser tests for the Settings dialog (design 9.11): it opens from the rail with its rows
 * and the package.json version, a change applies at once and is not an undo step, Done and
 * × close it, each key in the Keyboard list does what the list says, and the dialog is 900
 * wide with the Appearance and Genres tabs, whose change is not an undo step.
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

test('settings_reload_keepsSettings', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  await dialog(page).getByRole('radio', { name: 'Light' }).click();
  await dialog(page).getByRole('radio', { name: 'Blue' }).click();
  await dialog(page).getByRole('switch', { name: 'Snap To Grid' }).click();
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  await page.reload();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-mode', 'light');
  await expect(html).toHaveAttribute('data-theme', 'blue');
  await openSettings(page);
  await expect(dialog(page).getByRole('radio', { name: 'Light' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(dialog(page).getByRole('radio', { name: 'Blue' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(dialog(page).getByRole('switch', { name: 'Snap To Grid' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  // The board list follows the same settings.
  await page.getByRole('link', { name: 'Board List' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
  await expect(html).toHaveAttribute('data-mode', 'light');
  await expect(html).toHaveAttribute('data-theme', 'blue');
});

test('settings_lightReload_noDarkFrame', async ({ page }) => {
  // Records the mode and the body ground in the first animation frame of every load.
  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as unknown as { __firstFrame: unknown }).__firstFrame = {
        mode: document.documentElement.dataset.mode,
        background: document.body ? getComputedStyle(document.body).backgroundColor : null,
      };
    });
  });
  await openBoard(page);
  await openSettings(page);
  await dialog(page).getByRole('radio', { name: 'Light' }).click();
  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
  const first = await page.evaluate(
    () => (window as unknown as { __firstFrame: unknown }).__firstFrame,
  );
  expect(first).toEqual({ mode: 'light', background: 'rgb(245, 243, 238)' });
});

test('settings_secondTab_updatesUnderOneSecond', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await openBoard(a);
  await b.goto('/');
  await expect(b.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
  await expect(b.locator('html')).toHaveAttribute('data-mode', 'dark');
  await openSettings(a);
  await dialog(a).getByRole('radio', { name: 'Light' }).click();
  await expect(b.locator('html')).toHaveAttribute('data-mode', 'light', { timeout: 1000 });
  await dialog(a).getByRole('radio', { name: 'Green' }).click();
  await expect(b.locator('html')).toHaveAttribute('data-theme', 'green', { timeout: 1000 });
});

test('settings_blockedStorage_defaultsAndNote', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  // Boards still load: IndexedDB is not blocked.
  await openBoard(page, fixtureBoard([combinedCard('role', { x: 96, y: 96 })]));
  await expect(cardById(page, 'role-1')).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-mode', 'dark');
  await expect(html).toHaveAttribute('data-theme', 'orange');
  await openSettings(page);
  await expect(dialog(page)).toContainText(
    'This browser does not save settings. They reset when the page reloads.',
  );
  await expect(dialog(page).getByRole('switch', { name: 'Snap To Grid' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // A change still applies for this page.
  await dialog(page).getByRole('radio', { name: 'Light' }).click();
  await expect(html).toHaveAttribute('data-mode', 'light');
});

test('settings_dialog_is900WideWithTwoTabs', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  expect((await boxOf(dialog(page))).width).toBe(900);
  await expect(dialog(page).getByRole('tab')).toHaveText(['Appearance', 'Genres']);
  await expect(dialog(page).getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('settings_tabChange_notAnUndoStep', async ({ page }) => {
  await openBoard(page);
  await openSettings(page);
  await dialog(page).getByRole('tab', { name: 'Genres' }).click();
  await expect(dialog(page).getByRole('tab', { name: 'Genres' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await dialog(page).getByRole('tab', { name: 'Appearance' }).click();
  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
});
