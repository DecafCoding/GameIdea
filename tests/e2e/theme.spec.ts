/**
 * Browser tests for the 6 mode × theme color combinations (design 4.1 to 4.3, 9.1): both
 * screens take their chrome from the tokens of the chosen combination; cards, notes,
 * badges, deck colors and the Hook Card look the same in every combination; warning colors
 * stay fixed in Blue and Green; light-mode outlines use the light --accent-text.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import type { Accent, Mode } from '@/shared/model';
import { fixtureBoard, fixtureCard, fixtureNote } from '@/test/fixtures/boards';
import { cardById, openBoard, rail } from './board-helpers';
import { backgroundRgb, expectRgbNear } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

type Rgb = [number, number, number];

/** Design 4.1: the mode base. */
const BASE: Record<Mode, { bg: Rgb; canvas: Rgb; surface: Rgb }> = {
  dark: { bg: [0x1b, 0x1e, 0x24], canvas: [0x1b, 0x1e, 0x24], surface: [0x23, 0x27, 0x2f] },
  light: { bg: [0xf5, 0xf3, 0xee], canvas: [0xec, 0xe9, 0xe2], surface: [0xff, 0xff, 0xff] },
};

/** Design 4.2: the accent and the light-mode accent text. */
const ACCENT: Record<Accent, { accent: Rgb; lightText: Rgb }> = {
  orange: { accent: [0xe8, 0x74, 0x2e], lightText: [0xb4, 0x53, 0x1a] },
  blue: { accent: [0x4c, 0x8d, 0xf6], lightText: [0x2b, 0x5f, 0xb8] },
  green: { accent: [0x3f, 0xb3, 0x7f], lightText: [0x1f, 0x7a, 0x4f] },
};

const ON_ACCENT: Rgb = [0x1b, 0x1e, 0x24];
const WARN_TEXT: Rgb = [0xf6, 0xb0, 0x8a];
const DANGER_TEXT_DARK: Rgb = [0xf0, 0xa0, 0x90];

/** A CSS color property of an element as [r, g, b]. */
async function colorRgb(locator: Locator, property = 'color'): Promise<number[]> {
  return locator.evaluate((el, prop) => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = getComputedStyle(el).getPropertyValue(prop);
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, property);
}

/** A board with a Hook Card stack (so a badge shows), a free card and a note. */
function themedBoard() {
  return {
    ...fixtureBoard(
      [
        fixtureCard('hook', { x: 96, y: 96 }),
        fixtureCard('role', { x: 116, y: 152, z: 2, tuckedUnder: 'hook-1' }),
        fixtureCard('goal', { x: 116, y: 208, z: 3, tuckedUnder: 'role-1' }),
        fixtureCard('setting', { x: 528, y: 96, z: 4 }),
      ],
      [fixtureNote({ x: 816, y: 96, text: 'A note' })],
    ),
    id: 'themed',
    name: 'Themed',
  };
}

/** The fixed-look colors: card face, note paper, badge fill, Hook Card fill, deck ring. */
async function fixedLook(page: Page): Promise<number[][]> {
  return [
    await backgroundRgb(cardById(page, 'setting-1')),
    await backgroundRgb(page.getByTestId('note')),
    await backgroundRgb(page.getByTestId('connector-badge').first()),
    await backgroundRgb(page.getByRole('article', { name: 'Hook Card' })),
  ];
}

const MODES: Mode[] = ['dark', 'light'];
const ACCENTS: Accent[] = ['orange', 'blue', 'green'];

for (const mode of MODES) {
  for (const accent of ACCENTS) {
    test.describe(`${mode} ${accent}`, () => {
      test.use({ settings: { mode, accent } });

      test(`theme_${mode}_${accent}_boardScreenChromeFromTokens`, async ({ page }) => {
        await openBoard(page, themedBoard());
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
        await expect(page.locator('html')).toHaveAttribute('data-theme', accent);
        expectRgbNear(await backgroundRgb(page.locator('header').first()), BASE[mode].surface);
        expectRgbNear(await backgroundRgb(rail(page)), BASE[mode].surface);
        expectRgbNear(await backgroundRgb(page.getByTestId('canvas')), BASE[mode].canvas);
        const logo = page
          .locator('header')
          .getByRole('link', { name: 'Board List' })
          .locator('span')
          .first();
        expectRgbNear(await backgroundRgb(logo), ACCENT[accent].accent);
      });

      test(`theme_${mode}_${accent}_boardListChromeFromTokens`, async ({ page }) => {
        await openBoard(page, themedBoard());
        await page.getByRole('link', { name: 'Board List' }).click();
        const card = page.getByRole('list', { name: 'Saved Boards' }).getByRole('listitem').first();
        await expect(card).toBeVisible();
        expectRgbNear(
          await backgroundRgb(page.getByRole('main', { name: 'Board List' }).locator('..')),
          BASE[mode].bg,
        );
        expectRgbNear(await backgroundRgb(card), BASE[mode].surface);
        const newBoard = page.getByRole('button', { name: 'New Board' });
        expectRgbNear(await backgroundRgb(newBoard), ACCENT[accent].accent);
        expectRgbNear(await colorRgb(newBoard), ON_ACCENT);
      });

      test(`theme_${mode}_${accent}_cardsNotesBadgesHookUnchanged`, async ({ page }) => {
        await openBoard(page, themedBoard());
        const look = await fixedLook(page);
        // The dark orange baseline, read on the same page.
        await page.evaluate(() => {
          document.documentElement.dataset.mode = 'dark';
          document.documentElement.dataset.theme = 'orange';
        });
        const baseline = await fixedLook(page);
        look.forEach((rgb, i) => expectRgbNear(rgb, baseline[i]!));
      });
    });
  }
}

/** Makes every IndexedDB put fail once the flag is set, so the next save fails. */
async function failSavesFromNowOn(page: Page) {
  await page.addInitScript(() => {
    // Kept unbound on purpose: the wrapper calls it with the store as `this`.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<typeof put>
    ) {
      if ((window as unknown as { __failSaves?: boolean }).__failSaves) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
}

for (const accent of ['blue', 'green'] as const) {
  test.describe(`warning colors ${accent}`, () => {
    test.use({ settings: { mode: 'dark', accent } });

    test(`theme_blueGreen_warningColorsFixed_${accent}`, async ({ page }) => {
      await failSavesFromNowOn(page);
      await openBoard(page, themedBoard());
      await page.evaluate(() => {
        (window as unknown as { __failSaves?: boolean }).__failSaves = true;
      });
      // Any change saves; this one turns a ring through the strip menu's card.
      await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
      await page.keyboard.press('r');
      await expect(page.getByTestId('save-mark')).toHaveAttribute('data-state', 'failed');
      const banner = page.getByRole('alert').filter({ hasText: 'The board did not save.' });
      await expect(banner).toBeVisible();
      expectRgbNear(await colorRgb(banner.locator('p')), WARN_TEXT);
      expectRgbNear(await colorRgb(banner.locator('[data-icon]').first()), WARN_TEXT);
      expectRgbNear(await colorRgb(page.getByTestId('save-mark')), DANGER_TEXT_DARK);
      const discard = page.getByTestId('card-strip').getByRole('button', { name: 'Discard' });
      expectRgbNear(await colorRgb(discard), DANGER_TEXT_DARK);
    });
  });
}

for (const accent of ACCENTS) {
  test.describe(`light outline ${accent}`, () => {
    test.use({ settings: { mode: 'light', accent } });

    test(`theme_light_outlinesUseAccentText_${accent}`, async ({ page }) => {
      await openBoard(page, themedBoard());
      await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
      const outlined = page.locator('.react-flow__node[data-id="setting-1"] *').filter({
        has: page.locator('[data-card]'),
      });
      const color = await outlined.first().evaluate((el) => {
        const all = [el, ...el.querySelectorAll('*')];
        const hit = all.find((e) => getComputedStyle(e).outlineStyle === 'solid');
        return hit ? getComputedStyle(hit).outlineColor : null;
      });
      expect(color).not.toBeNull();
      const [r, g, b] = ACCENT[accent].lightText;
      expect(color).toBe(`rgb(${r}, ${g}, ${b})`);
    });
  });
}
