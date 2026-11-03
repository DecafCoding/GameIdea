/**
 * Real-pool smoke test (pool-files in docs/architecture.html): with the fixture route
 * removed, every rail button draws a card of its deck from the shipped files in
 * public/pools/, with distinct cues, and no pool request fails.
 */
import { expect, test } from './test';
import { canvasCards, drawFromRail, openBoard } from './board-helpers';
import type { DeckName } from './helpers';

const RAIL: [DeckName, string, string | null][] = [
  ['Hook Card', 'hook', null],
  ['Player Role', 'role', null],
  ['Mechanic', 'mechanic', null],
  ['Resource', 'resource', null],
  ['Goal', 'goal', null],
  ['Conflict', 'conflict', null],
  ['Player Role Modifier', 'modifier', 'role'],
  ['Resource Modifier', 'modifier', 'resource'],
  ['Setting Modifier', 'modifier', 'setting'],
  ['Setting', 'setting', null],
];

test('poolsReal_everyRailButton_drawsItsDeck', async ({ page, context }) => {
  await context.unroute('**/pools/*.json');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const failed: string[] = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => {
    if (response.url().includes('/pools/') && !response.ok()) failed.push(response.url());
  });
  await openBoard(page);

  for (const [deck, type, modDeck] of RAIL) {
    await drawFromRail(page, deck);
    const selector = modDeck
      ? `[data-type="modifier"][data-mod-deck="${modDeck}"]`
      : `[data-type="${type}"]`;
    const card = canvasCards(page).and(page.locator(selector));
    await expect(card).toHaveCount(1);
    if (type !== 'hook') {
      const cues = await card.locator('[data-edge]').allTextContents();
      expect(cues.length).toBeGreaterThanOrEqual(2);
      expect(new Set(cues.map((c) => c.toLowerCase())).size).toBe(cues.length);
    }
    // Undo the draw so the next card lands alone, inside the view.
    await page.keyboard.press('Control+z');
    await expect(canvasCards(page)).toHaveCount(0);
  }
  expect(failed).toEqual([]);
});
