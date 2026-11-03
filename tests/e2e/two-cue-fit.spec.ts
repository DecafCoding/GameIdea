/**
 * Browser tests for the cue fit on the 200 px card (design 9.4).
 * 2-cue cards: Goal and Conflict cues of up to 8 words show in full, in at most
 * 2 lines of 17 px, visible on a tucked card, with the outer side on the 14 px inset. Each pair is served as a
 * routed 2-cue pool, so the card shows exactly those 2 cues.
 * 4-cue cards: with the longest pool cues on every edge, plain and combined, no 2 edge
 * labels touch at a corner, and each stays inside the card and outside the outer ring.
 * A combined card's side labels may end in an ellipsis on the 200 px card.
 * Player Role and Setting use the 4-cue frame: top and bottom edges and sides use up to 2
 * lines of 15 px, and lines break after a hyphen. A tucked card hides its side edges.
 * The genre pools hold longer cues on purpose (docs/feature-genre-pools.html, "Long cues"):
 * the user reviews them in the app and then sets limits. Until then these checks use only
 * the pool cues inside the old fit limits (FIT_LIMITS).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import type { Card, Cue } from '@/shared/model';
import { cardById, openBoard } from './board-helpers';
import { draw, type DeckName } from './helpers';

type TwoCueType = 'goal' | 'conflict';

const TYPES: { type: TwoCueType; deck: DeckName; prefix: string; worst: [string, string] }[] = [
  {
    type: 'goal',
    deck: 'Goal',
    prefix: 'mo',
    worst: ['wants to find the home the fleet left', 'wants to outlive the war that made her'],
  },
  {
    type: 'conflict',
    deck: 'Conflict',
    prefix: 'co',
    worst: ['the map keeps changing', 'but the last ship home is already gone'],
  },
];

/**
 * From the card center: the start of the band a tucked card still shows (100 - the 56 px
 * tuck offset) and the 14 px inset, where every label's outer side sits (100 - 14).
 */
const TUCK_VISIBLE = 44;
const INSET_EDGE = 86;
const MAX_WIDTH = 172;

/**
 * The old cue fit class: most characters per type, and at most 2 words for the 4-cue types.
 * Longer genre cues are out of scope here until the user sets new limits.
 */
const FIT_LIMITS: Partial<Record<Card['type'], number>> = {
  role: 16,
  setting: 16,
  modifier: 10,
  goal: 38,
  conflict: 38,
};

/** Whether a cue is inside the old fit class for its type. */
function inFitClass(type: Card['type'], text: string): boolean {
  if (text.length > (FIT_LIMITS[type] ?? 0)) return false;
  const fourCue = type === 'role' || type === 'setting' || type === 'modifier';
  return !fourCue || text.split(/s+/).length <= 2;
}

/** The fixture pool file's cues inside the old fit class, longest text first. */
function poolByLength(type: Card['type']): Cue[] {
  const file = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'pools', `${type}.json`);
  const pool = JSON.parse(readFileSync(file, 'utf8')) as { cues: (Cue & { genres: string[] })[] };
  return pool.cues
    .filter((cue) => inFitClass(type, cue.text))
    .map((cue): Cue => ({ text: cue.text }))
    .sort((a, b) => b.text.length - a.text.length);
}

/** The 4 longest cues of the fixture pool file, as 2 pairs. */
function longestPairs(type: TwoCueType): [string, string][] {
  const longest = poolByLength(type)
    .map((cue) => cue.text)
    .slice(0, 4);
  return [
    [longest[0]!, longest[1]!],
    [longest[2]!, longest[3]!],
  ];
}

async function expectPairFits(
  page: Page,
  type: TwoCueType,
  deck: DeckName,
  prefix: string,
  pair: [string, string],
) {
  const pattern = `**/pools/${type}.json`;
  await page.route(pattern, (route) =>
    route.fulfill({
      json: {
        type,
        cues: [
          { id: `${prefix}-001`, text: pair[0] },
          { id: `${prefix}-002`, text: pair[1] },
        ],
      },
    }),
  );
  await page.goto('/#/card-test');
  await expect(page.getByRole('button', { name: `Draw A ${deck}` })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const card = await draw(page, deck);
  const box = (await card.boundingBox())!;
  const centerY = box.y + box.height / 2;

  const labels = card.locator('[data-edge]');
  await expect(labels).toHaveCount(2);
  for (const label of await labels.all()) {
    const text = (await label.textContent()) ?? '';
    const m = await label.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });
    expect(m.scrollHeight, `${text} is clamped`).toBeLessThanOrEqual(m.clientHeight + 1);
    expect(m.clientHeight, `${text} is over 2 lines`).toBeLessThanOrEqual(35);
    expect(m.width, `${text} is too wide`).toBeLessThanOrEqual(MAX_WIDTH);
    const near = Math.min(Math.abs(m.top - centerY), Math.abs(m.bottom - centerY));
    const far = Math.max(Math.abs(m.top - centerY), Math.abs(m.bottom - centerY));
    expect(near, `${text} hides under the card above when tucked`).toBeGreaterThanOrEqual(
      TUCK_VISIBLE,
    );
    expect(far, `${text} runs past the inset`).toBeLessThanOrEqual(INSET_EDGE + 0.5);
  }
  await page.unroute(pattern);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const { type, deck, prefix, worst } of TYPES) {
  test(`twoCueCard_worstCaseCues_fitTwoLinesClearOfRing (${type})`, async ({ page }) => {
    await expectPairFits(page, type, deck, prefix, worst);
  });

  test(`twoCueCard_longestPoolCues_fitTwoLinesClearOfRing (${type})`, async ({ page }) => {
    for (const pair of longestPairs(type)) {
      await expectPairFits(page, type, deck, prefix, pair);
    }
  });
}

/** The outer ring's outside radius, from the card center (design 9.3). */
const OUTER_RING = 56;

/**
 * The pool cue that renders widest in the active cue font (15 / 700 Space Grotesk). The
 * widest is not always the one with the most letters, so it is measured in the page.
 */
async function widest(page: Page, type: Card['type']): Promise<Cue> {
  const cues = poolByLength(type);
  const index = await page.evaluate(
    async (texts) => {
      const font = '700 15px "Space Grotesk"';
      await document.fonts.load(font);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = font;
      const widths = texts.map((text) => context.measureText(text).width);
      return widths.indexOf(Math.max(...widths));
    },
    cues.map((cue) => cue.text),
  );
  return cues[index]!;
}

/** A 4-cue card with the widest pool noun on every edge, and the widest adjective if combined. */
async function longestCard(page: Page, type: 'role' | 'setting', combined: boolean) {
  const noun = await widest(page, type);
  const adjective = await widest(page, 'modifier');
  const rings: Card['rings'] = [{ cues: [noun, noun, noun, noun], activeIndex: 0 }];
  if (combined) rings.push({ cues: [adjective, adjective, adjective, adjective], activeIndex: 0 });
  return fixtureCard(type, { x: 96, y: 96, rings });
}

for (const type of ['role', 'setting'] as const) {
  for (const combined of [false, true]) {
    const name = `fourCueCard_longestCuesOnEveryEdge_labelsClearAtCorners (${type}${combined ? ', combined' : ''})`;
    test(name, async ({ page }) => {
      // Measure on the app page, then leave it so the board seam runs on a fresh load.
      await page.goto('/');
      const board = fixtureBoard([await longestCard(page, type, combined)]);
      await page.goto('about:blank');
      await openBoard(page, board);
      await page.evaluate(() => document.fonts.ready);
      const card = cardById(page, `${type}-1`);
      const labels = await card.locator('[data-edge]').all();
      expect(labels).toHaveLength(4);
      const box = (await card.boundingBox())!;
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      const rects = [];
      for (const label of labels) {
        const m = await label.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const lines = Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight));
          return {
            edge: Number(el.dataset.edge),
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            lines,
            width: el.clientWidth,
            clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
            text: el.textContent ?? '',
          };
        });
        // A combined card's side label (adjective and noun in a 108 px, 2-line box) may end
        // in an ellipsis: the 200 px card has no room for more (design 9.4), and the title
        // holds the full text. Every other label shows in full.
        if (!(combined && m.edge % 2 === 1)) {
          expect(m.clipped, `${m.text} is cut off`).toBe(false);
        }
        // Edge 0 is the bottom; the odd edges are the sides.
        expect(m.lines, `${m.text} is ${m.lines} lines at ${m.width} px`).toBeLessThanOrEqual(
          m.edge % 2 === 1 ? 3 : 2,
        );
        expect(m.left, `${m.text} leaves the card`).toBeGreaterThanOrEqual(box.x);
        expect(m.right, `${m.text} leaves the card`).toBeLessThanOrEqual(box.x + box.width);
        expect(m.top, `${m.text} leaves the card`).toBeGreaterThanOrEqual(box.y);
        expect(m.bottom, `${m.text} leaves the card`).toBeLessThanOrEqual(box.y + box.height);
        // The point of the box nearest the center stays outside the outer ring.
        const dx = Math.max(m.left - center.x, 0, center.x - m.right);
        const dy = Math.max(m.top - center.y, 0, center.y - m.bottom);
        expect(Math.hypot(dx, dy), `${m.text} runs under the ring`).toBeGreaterThanOrEqual(
          OUTER_RING,
        );
        rects.push(m);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!;
          const b = rects[j]!;
          const touch =
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          expect(touch, `edges ${i} and ${j} touch`).toBe(false);
        }
      }
    });
  }
}

test('roleCard_hyphenatedNoun_splitsAtHyphenInTwoLines', async ({ page }) => {
  // No spaces and wider than 172 px: the only legal breaks are after the hyphens, so 2
  // unclipped lines prove it.
  const noun = { text: 'street-samurai-for-hire-and-mercenary' };
  const card = fixtureCard('role', {
    x: 96,
    y: 96,
    rings: [{ cues: [noun, noun, noun, noun], activeIndex: 0 }],
  });
  await openBoard(page, fixtureBoard([card]));
  await page.evaluate(() => document.fonts.ready);
  const label = cardById(page, 'role-1').getByTestId('active-cue');
  const m = await label.evaluate((el) => ({
    lines: Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight)),
    clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
  }));
  expect(m.lines).toBe(2);
  expect(m.clipped).toBe(false);
});

test('combinedCard_longHyphenatedCues_staysInTwoLinesAndSplitsAtHyphen', async ({ page }) => {
  // The noun has no spaces and is wider than the label, so it fits only by breaking at a
  // hyphen. Together the words need more than 2 lines, so the label must clamp at 2.
  const noun = { text: 'street-samurai-for-hire-and-mercenary' };
  const adjective = { text: 'surveillance-rigged' };
  const card = fixtureCard('role', {
    x: 96,
    y: 96,
    rings: [
      { cues: [noun, noun, noun, noun], activeIndex: 0 },
      { cues: [adjective, adjective, adjective, adjective], activeIndex: 0 },
    ],
  });
  await openBoard(page, fixtureBoard([card]));
  await page.evaluate(() => document.fonts.ready);
  const role = cardById(page, 'role-1');
  const measure = () =>
    role.getByTestId('active-cue').evaluate((el) => ({
      lines: Math.round(
        el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
      ),
      overflowsSideways: el.scrollWidth > el.clientWidth + 1,
    }));
  expect(await measure()).toEqual({ lines: 2, overflowsSideways: false });

  // A turn remounts the words with the slide-in animation; the clamp must still hold.
  await role.getByTestId('active-cue').hover();
  await page.keyboard.press('r');
  expect(await measure()).toEqual({ lines: 2, overflowsSideways: false });
});

test('tuckedCard_sideEdges_hidden', async ({ page }) => {
  const nouns = ['captain', 'pilot', 'medic', 'smuggler'].map((text) => ({ text }));
  const board = fixtureBoard([
    fixtureCard('goal', { x: 96, y: 96 }),
    fixtureCard('role', {
      x: 96,
      y: 152,
      z: 2,
      tuckedUnder: 'goal-1',
      rings: [{ cues: nouns, activeIndex: 0 }],
    }),
  ]);
  await openBoard(page, board);
  const tucked = cardById(page, 'role-1');
  await expect(tucked.locator('[data-edge="0"]')).toBeVisible();
  await expect(tucked.locator('[data-edge="2"]')).toBeVisible();
  await expect(tucked.locator('[data-edge="1"]')).toBeHidden();
  await expect(tucked.locator('[data-edge="3"]')).toBeHidden();
});
