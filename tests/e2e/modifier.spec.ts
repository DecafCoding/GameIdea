/**
 * Browser tests for the 3 Modifier decks (docs/feature-modifier-decks.html; design 9.8),
 * on the fixture pools and fixture boards: each Modifier button draws only its targets,
 * the brief's "tall frozen pilot" example, swap, an On Top card through Redraw, reload,
 * export and import, and a Modifier over another deck tucking with no zone.
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card, ModDeck } from '@/shared/model';
import { combinedCard, fixtureBoard, fixtureCard, secondModifier } from '@/test/fixtures/boards';
import {
  boxOf,
  canvasCards,
  cardById,
  dragTo,
  drawFromRail,
  openBoard,
  rail,
  waitForStoredCard,
} from './board-helpers';
import { exportFile } from './export-helpers';
import type { DeckName } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/** The 4 cues of each Modifier deck in the fixture pool. */
const FIXTURE: Record<ModDeck, string[]> = {
  role: ['exiled', 'orbital', 'reanimated', 'haunted'],
  resource: ['stolen', 'borrowed', 'rusty', 'glowing'],
  setting: ['flooded', 'frozen', 'sunken', 'silent'],
};
const BUTTON: Record<ModDeck, DeckName> = {
  role: 'Player Role Modifier',
  resource: 'Resource Modifier',
  setting: 'Setting Modifier',
};
const ICON: Record<ModDeck, string> = {
  role: 'user-plus',
  resource: 'battery-plus',
  setting: 'map-pin-plus',
};

/** A point inside a card, relative to its top-left, as a page point. */
async function pointOn(page: Page, id: string, dx: number, dy: number) {
  const box = await boxOf(cardById(page, id));
  return { x: box.x + dx, y: box.y + dy };
}

const ring = (texts: string[]) => ({ cues: texts.map((text) => ({ text })), activeIndex: 0 });

function modifier(id: string, modDeck: ModDeck, texts: string[], at: Partial<Card>): Card {
  return fixtureCard('modifier', { id, modDeck, rings: [ring(texts)], ...at });
}

/** The brief's board: a Player Role "pilot" and 3 Modifiers. */
function briefBoard(): Board {
  return fixtureBoard([
    fixtureCard('role', {
      id: 'pilot',
      x: 96,
      y: 96,
      rings: [ring(['pilot', 'diver', 'medic', 'scout'])],
    }),
    modifier('frozen', 'setting', ['frozen', 'sunken', 'silent', 'flooded'], {
      x: 432,
      y: 96,
      z: 2,
    }),
    modifier('tall', 'role', ['tall', 'brave', 'old', 'quiet'], { x: 432, y: 360, z: 3 }),
    modifier('third', 'resource', ['rusty', 'stolen', 'spare', 'shiny'], { x: 720, y: 360, z: 4 }),
  ]);
}

const active = (page: Page, id: string) => cardById(page, id).getByTestId('active-cue');

test('modifier_eachButton_drawsOnlyItsTargets', async ({ page }) => {
  await openBoard(page);
  for (const modDeck of ['role', 'resource', 'setting'] as const) {
    for (let i = 0; i < 6; i++) {
      await drawFromRail(page, BUTTON[modDeck]);
      const card = canvasCards(page).first();
      await expect(canvasCards(page)).toHaveCount(1);
      await expect(card).toHaveAttribute('data-mod-deck', modDeck);
      await expect(
        card.getByTestId('type-disc').locator(`[data-icon="${ICON[modDeck]}"]`),
      ).toHaveCount(1);
      const cues = await card.locator('[data-edge]').allTextContents();
      expect(cues).toHaveLength(4);
      for (const cue of cues) expect(FIXTURE[modDeck]).toContain(cue);
      // Undo the draw so the next one lands alone.
      await page.keyboard.press('Control+z');
      await expect(canvasCards(page)).toHaveCount(0);
    }
  }
  await expect(
    rail(page).getByRole('button', { name: 'Draw A Resource Modifier' }),
  ).toHaveAttribute('title', 'Resource Modifier');
});

test('modifier_briefExample_readsTallFrozenPilot', async ({ page }) => {
  await openBoard(page, briefBoard());
  // "frozen" anywhere on the plain card merges.
  await dragTo(page, cardById(page, 'frozen'), await pointOn(page, 'pilot', 100, 150));
  await expect(cardById(page, 'frozen')).toHaveCount(0);
  await expect(active(page, 'pilot')).toHaveText('frozen pilot');

  // "tall" in the top band goes on top.
  await dragTo(
    page,
    cardById(page, 'tall'),
    await pointOn(page, 'pilot', 100, 20),
    undefined,
    false,
  );
  await expect(page.getByTestId('zone-top')).toHaveText('Add on top');
  await page.mouse.up();
  await expect(cardById(page, 'tall')).toHaveCount(0);
  await expect(active(page, 'pilot')).toHaveText('tall frozen pilot');

  // A third Modifier over the card sees only the swap zone.
  const home = await pointOn(page, 'third', 30, 30);
  await dragTo(
    page,
    cardById(page, 'third'),
    await pointOn(page, 'pilot', 100, 20),
    undefined,
    false,
  );
  await expect(page.getByTestId('zone-swap')).toBeVisible();
  await expect(page.getByTestId('zone-top')).toHaveCount(0);
  // Back to where it started (empty canvas): nothing changes on the card.
  await page.mouse.move(home.x, home.y, { steps: 6 });
  await page.mouse.up();
  await expect(active(page, 'pilot')).toHaveText('tall frozen pilot');

  // Split takes the merged ring off; the On Top adjective stays.
  await cardById(page, 'pilot').click({ position: { x: 30, y: 100 } });
  await page.getByTestId('card-strip').getByRole('button', { name: 'Split' }).click();
  await expect(active(page, 'pilot')).toHaveText('tall pilot');
  const split = page.locator('.react-flow__node [data-card][data-mod-deck="setting"]');
  await expect(split).toHaveCount(1);
  await expect(split.getByTestId('type-disc').locator('[data-icon="map-pin-plus"]')).toHaveCount(1);
  await expect(split.getByTestId('active-cue')).toHaveText('frozen');
});

test('modifier_swapCenter_returnsOldAdjectivesBeside', async ({ page }) => {
  const board = fixtureBoard([
    combinedCard('role', { x: 96, y: 96 }),
    secondModifier({ x: 432, y: 96, z: 2, modDeck: 'setting' }),
  ]);
  await openBoard(page, board);
  await dragTo(page, cardById(page, 'modifier-2'), await pointOn(page, 'role-1', 100, 120));
  await expect(active(page, 'role-1')).toHaveText('devout navigator');
  const back = cardById(page, 'modifier-2');
  await expect(back.getByTestId('active-cue')).toHaveText('exiled');
  // The old adjectives came from the Player Role Modifier deck.
  await expect(back).toHaveAttribute('data-mod-deck', 'role');
  const a = await boxOf(cardById(page, 'role-1'));
  const b = await boxOf(back);
  const overlap =
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  expect(overlap).toBe(false);
});

test('modifier_onTop_survivesRedrawReloadExportImport', async ({ page }) => {
  const board = {
    ...fixtureBoard([
      combinedCard('role', { x: 96, y: 96 }),
      modifier('tall', 'role', ['tall', 'brave', 'old', 'quiet'], {
        x: 0,
        y: 0,
        z: 2,
        onTopOf: 'role-1',
      }),
    ]),
    id: 'on-top-board',
    name: 'On Top',
  };
  await openBoard(page, board);
  await expect(active(page, 'role-1')).toHaveText('tall exiled navigator');

  // Redraw changes the nouns only.
  await cardById(page, 'role-1').click({ position: { x: 30, y: 100 } });
  await page.getByTestId('card-strip').getByRole('button', { name: 'Redraw' }).click();
  await expect(active(page, 'role-1')).toHaveText(/^tall exiled /);
  const redrawn = (await active(page, 'role-1').textContent())!;

  // Reload only once the Redraw is stored (the stored noun is the one on screen) and the
  // save mark is back to saved.
  const noun = redrawn.replace(/^tall exiled /, '');
  await waitForStoredCard(page, board.id, 'role-1', (card) => {
    const ring = card.rings[0]!;
    return ring.cues[ring.activeIndex]!.text === noun;
  });
  await expect(page.getByTestId('save-mark')).toHaveAttribute('data-state', 'saved');
  await page.reload();
  await expect(active(page, 'role-1')).toHaveText(redrawn);

  // Export the board file and import it as a new board.
  const download = await exportFile(page, 'Board File');
  const buffer = await readFile(await download.path());
  await page.goto('/#/');
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import Board File' }).first().click();
  await (
    await choosing
  ).setFiles({ name: 'On Top.gameidea.json', buffer, mimeType: 'application/json' });
  await expect(page.getByRole('status')).toContainText('Board imported.');
  await page.getByRole('link', { name: 'On Top (imported)' }).click();
  await expect(active(page, 'role-1')).toHaveText(redrawn);
  await expect(cardById(page, 'tall')).toHaveCount(0);
});

test('modifier_onMechanic_tucksWithoutZone', async ({ page }) => {
  const board = fixtureBoard([
    fixtureCard('mechanic', { x: 96, y: 96 }),
    fixtureCard('modifier', { x: 432, y: 96, z: 2 }),
  ]);
  await openBoard(page, board);
  await dragTo(
    page,
    cardById(page, 'modifier-1'),
    await pointOn(page, 'mechanic-1', 100, 100),
    undefined,
    false,
  );
  await expect(page.getByTestId('hint-combine')).toHaveCount(0);
  await expect(page.getByTestId('hint-zones')).toHaveCount(0);
  await page.mouse.up();
  await expect
    .poll(async () => {
      const card = await boxOf(cardById(page, 'modifier-1'));
      const parent = await boxOf(cardById(page, 'mechanic-1'));
      return Math.abs(card.y - parent.y - 56) <= 1 && Math.abs(card.x - parent.x) <= 1;
    })
    .toBe(true);
  // A Modifier never gets a badge.
  await expect(page.getByTestId('connector-badge')).toHaveCount(0);
});
