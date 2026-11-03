/**
 * Browser tests for the shell at its locked sizes (design 8.1 to 8.3): the 56 px top bar,
 * the 232 px rail, 36 px rail deck buttons, the default theme attributes, the bundled
 * fonts, and the token switch: a script that sets Light mode and the Green theme changes
 * the chrome but not the cards (the switch UI is Phase 5).
 */
import { expect, test } from './test';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard, rail } from './board-helpers';
import { backgroundRgb, expectRgbNear } from './helpers';

const topBar = (page: import('@playwright/test').Page) => page.locator('header');

test('shell_topBar_is56Tall', async ({ page }) => {
  await openBoard(page);
  expect((await boxOf(topBar(page))).height).toBe(56);
});

test('shell_rail_is232Wide', async ({ page }) => {
  await openBoard(page);
  expect((await boxOf(rail(page))).width).toBe(232);
});

test('shell_deckButtons_are36Tall', async ({ page }) => {
  await openBoard(page);
  const buttons = rail(page).getByRole('button', { name: /^Draw A / });
  await expect(buttons).toHaveCount(6);
  for (const button of await buttons.all()) expect((await boxOf(button)).height).toBe(36);
});

test('shell_html_defaultsToDarkOrange', async ({ page }) => {
  await openBoard(page);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-mode', 'dark');
  await expect(html).toHaveAttribute('data-theme', 'orange');
  await expect(topBar(page)).toHaveCSS('background-color', 'rgb(35, 39, 47)');
});

test('shell_fonts_areBundled', async ({ page }) => {
  await openBoard(page);
  const loaded = await page.evaluate(async () => {
    await document.fonts.load('700 17px "Space Grotesk"');
    await document.fonts.ready;
    return document.fonts.check('700 17px "Space Grotesk"');
  });
  expect(loaded).toBe(true);
});

test('shell_themeAttributes_changeChromeNotCards', async ({ page }) => {
  await openBoard(page, fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]));
  const card = cardById(page, 'role-1');
  const logo = topBar(page).getByRole('link', { name: 'Board List' }).locator('span').first();
  const cardBefore = await backgroundRgb(card);

  await page.evaluate(() => {
    document.documentElement.dataset.mode = 'light';
    document.documentElement.dataset.theme = 'green';
  });

  await expect(topBar(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(logo).toHaveCSS('background-color', 'rgb(63, 179, 127)');
  // The card face token stays #F4F0E6 and the card paper does not change.
  const face = await card.evaluate((el) => getComputedStyle(el).getPropertyValue('--card-face'));
  expect(face.trim().toUpperCase()).toBe('#F4F0E6');
  expectRgbNear(await backgroundRgb(card), cardBefore);
});
