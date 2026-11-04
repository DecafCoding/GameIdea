/**
 * Browser tests for the board screen: the shell, the empty board, drawing onto the canvas,
 * fixture boards, the pools banner, selection and the card strip, keys, and locked tokens.
 */
import type { Page, Route } from '@playwright/test';
import type { Board } from '@/shared/model';
import { expect, test } from './test';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
} from '@/test/fixtures/boards';
import {
  boxOf,
  canvasCards,
  cardById,
  createBoard,
  drawFromRail,
  openBoard,
  rail,
  storedBoards,
} from './board-helpers';
import { backgroundRgb, expectRgbNear, type DeckName } from './helpers';

const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. The deck buttons are off until the decks load.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const badge = (page: import('@playwright/test').Page) => page.getByTestId('count-badge');

test('board_emptyBoard_showsPanelAndZeroCounts', async ({ page }) => {
  await openBoard(page);
  await expect(page).toHaveURL(/#\/board\/[\w-]+$/);
  const guide = page.getByRole('region', { name: 'Build Your First Hook' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('listitem')).toHaveText(
    [
      'Draw a Hook Card from the top of the rail.',
      'Draw a Player Role and tuck it under the Hook Card.',
      'Add a Mechanic, a Resource, a Goal and a Conflict. Turn the rings until the sentence reads well.',
    ].map((step, i) => `${i + 1}${step}`),
  );
  await expect(page.getByTestId('start-here')).toHaveText('Start Here');
  await expect(badge(page)).toContainText('0 cards');
  await expect(rail(page).getByRole('button', { name: 'Genres' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Board List' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Board Name' })).toHaveValue('Test Board');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByTestId('zoom-strip')).toBeVisible();
});

test('board_firstCardFromRail_hidesGuide', async ({ page }) => {
  await openBoard(page);
  const guide = page.getByRole('region', { name: 'Build Your First Hook' });
  await expect(guide).toBeVisible();
  await rail(page).getByRole('button', { name: 'Draw A Hook Card', exact: true }).click();
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(guide).toHaveCount(0);
  await expect(page.getByTestId('start-here')).toHaveCount(0);
  await expect(badge(page)).toHaveText('1 card · 0 notes');

  // The guide does not come back for this board, even when it empties.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(canvasCards(page)).toHaveCount(0);
  await expect(guide).toHaveCount(0);
});

test('board_drawEachDeck_cardsDoNotOverlap', async ({ page }) => {
  await openBoard(page);
  const decks: DeckName[] = [
    'Hook Card',
    'Player Role',
    'Mechanic',
    'Resource',
    'Goal',
    'Conflict',
    'Player Role Modifier',
    'Resource Modifier',
    'Setting Modifier',
    'Setting',
    'Mood',
    'Twist',
    'Progression',
    'Constraint',
  ];
  for (const deck of decks) await drawFromRail(page, deck);
  await expect(badge(page)).toHaveText('14 cards · 0 notes');
  // The saved places, not the rendered nodes: the canvas renders only the cards in view.
  await expect.poll(async () => (await storedBoards(page))[0]?.cards.length).toBe(14);
  const cards = (await storedBoards(page))[0]!.cards;
  expect(cards.map((c) => c.type).sort()).toEqual([
    'conflict',
    'constraint',
    'goal',
    'hook',
    'mechanic',
    'modifier',
    'modifier',
    'modifier',
    'mood',
    'progression',
    'resource',
    'role',
    'setting',
    'twist',
  ]);
  const box = (c: Board['cards'][number]) => ({
    x: c.x,
    y: c.y,
    width: c.type === 'hook' ? 240 : 200,
    height: 200,
  });
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = box(cards[i]!);
      const b = box(cards[j]!);
      const overlap =
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlap).toBe(false);
    }
  }
});

test('board_fixture_rendersAllCards', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard(
      [...fixtureStack(48, 48), fixtureCard('setting', { x: 480, y: 48, z: 9 })],
      [fixtureNote({ x: 720, y: 48 })],
    ),
  );
  await expect(canvasCards(page)).toHaveCount(4);
  await expect(page.getByTestId('note')).toHaveCount(1);
  await expect(badge(page)).toHaveText('4 cards · 1 note');
  await expect(page.getByRole('heading', { name: 'Build Your First Hook' })).toHaveCount(0);
});

test('board_poolsBlocked_bannerThenRetry', async ({ page }) => {
  // Only this handler goes on unroute; the fixture pools route stays.
  const block = (route: Route) => route.abort();
  await page.route('**/pools/*.json', block);
  await page.goto('/');
  await createBoard(page);
  const alert = page.getByRole('alert');
  await expect(alert).toContainText(POOLS_FAILED_TEXT);
  for (const button of await rail(page)
    .getByRole('button', { name: /^Draw A / })
    .all()) {
    // The Hook Card needs no pool, so its button stays on.
    if ((await button.getAttribute('aria-label')) === 'Draw A Hook Card') {
      await expect(button).toBeEnabled();
    } else {
      await expect(button).toBeDisabled();
    }
  }
  await page.unroute('**/pools/*.json', block);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toHaveCount(0);
  await drawFromRail(page, 'Conflict');
  await expect(canvasCards(page)).toHaveCount(1);
});

test('board_drawAndTurn_under100ms', { tag: '@timing' }, async ({ page }) => {
  // Warm the engine with one draw, then measure on a fresh page (see card-test.spec.ts).
  await openBoard(page);
  await drawFromRail(page, 'Player Role');
  await page.reload();
  await expect(
    rail(page).getByRole('button', { name: 'Draw A Player Role', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const drawResult = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>(
      'aside [aria-label="Draw A Player Role"]',
    )!;
    const start = performance.now();
    button.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      elapsed: performance.now() - start,
      shown: document.querySelectorAll('[data-testid="card"]').length > 0,
    };
  });
  expect(drawResult.shown).toBe(true);
  expect(drawResult.elapsed).toBeLessThan(100);

  const turnResult = await page.evaluate(async () => {
    const card = document.querySelector('.react-flow__node [data-testid="card"]')!;
    const ring = card.querySelector<HTMLButtonElement>('[aria-label="Turn Nouns Right"]')!;
    const before = card.querySelector('[data-testid="active-cue"]')!.textContent;
    const start = performance.now();
    ring.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const elapsed = performance.now() - start;
    const after = card.querySelector('[data-testid="active-cue"]')!.textContent;
    return { elapsed, changed: after !== before };
  });
  expect(turnResult.changed).toBe(true);
  expect(turnResult.elapsed).toBeLessThan(100);
});

/** A tucked card's Lock / Unlock button, beside the card. */
const tuckLock = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"] [data-testid="tuck-lock"]`);

test.describe('selection', () => {
  const stack = () =>
    fixtureBoard([...fixtureStack(96, 96), fixtureCard('setting', { x: 480, y: 96, z: 9 })]);

  test('select_clickCard_showsStripAndOutline', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    const strip = page.getByTestId('card-strip');
    await expect(strip).toBeVisible();
    expect(
      await strip
        .getByRole('button')
        .evaluateAll((els) => els.map((el) => el.getAttribute('title'))),
    ).toEqual(['Redraw', 'Duplicate', 'Lock', 'Discard']);
    await expect(
      strip.getByRole('button', { name: 'Lock' }).locator('[data-icon]'),
    ).toHaveAttribute('data-icon', 'lock-open');
    const wrapper = page.locator('.react-flow__node[data-id="setting-1"] [data-selected]');
    await expect(wrapper).toHaveCSS('outline-width', '2px');
    await expect(wrapper).toHaveCSS('outline-color', 'rgb(232, 116, 46)');
    // The strip's bottom sits 4 px above the card (user 2026-11-03).
    const gap =
      (await boxOf(cardById(page, 'setting-1'))).y -
      ((await boxOf(strip)).y + (await boxOf(strip)).height);
    expect(Math.abs(gap - 4)).toBeLessThanOrEqual(1);
  });

  test('strip_lock_marksCardAndUndoes', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    const strip = page.getByTestId('card-strip');
    await strip.getByRole('button', { name: 'Lock' }).click();
    await expect(cardById(page, 'setting-1').getByTestId('lock-mark')).toBeVisible();
    const unlock = strip.getByRole('button', { name: 'Unlock' });
    await expect(unlock).toHaveAttribute('aria-pressed', 'true');
    await expect(unlock.locator('[data-icon]')).toHaveAttribute('data-icon', 'lock');
    await page.keyboard.press('Control+z');
    await expect(cardById(page, 'setting-1').getByTestId('lock-mark')).toHaveCount(0);
  });

  test('lockedTuckedMechanic_strip_showsActiveCueAndLock', async ({ page }) => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 96, y: 96 }),
      fixtureCard('mechanic', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1', locked: true }),
    ]);
    await openBoard(page, board);
    const mechanic = cardById(page, 'mechanic-1');
    const card = await boxOf(mechanic);
    const role = await boxOf(cardById(page, 'role-1'));
    // The visible strip is the part below the Player Role.
    const stripTop = role.y + role.height;
    const cue = await boxOf(mechanic.getByTestId('active-cue'));
    expect(cue.y).toBeGreaterThanOrEqual(stripTop);
    expect(cue.y + cue.height).toBeLessThanOrEqual(card.y + card.height);
    // The type mark sits in the strip's band, in the card's bottom-right corner.
    const mark = await boxOf(mechanic.getByTestId('tuck-mark'));
    expect(mark.y).toBeGreaterThanOrEqual(stripTop);
    expect(mark.y + mark.height).toBeLessThanOrEqual(card.y + card.height);
    expect(mark.x + mark.width).toBeLessThanOrEqual(card.x + card.width);
    expect(mark.x + mark.width).toBeGreaterThanOrEqual(card.x + card.width - 6);
    // The lock is a button just outside the right edge, in the band, shown while locked.
    await expect(mechanic.getByTestId('lock-mark')).toHaveCount(0);
    const lock = tuckLock(page, 'mechanic-1');
    await expect(lock).toHaveCSS('opacity', '1');
    await expect(lock).toHaveAttribute('aria-label', 'Unlock');
    const box = await boxOf(lock);
    expect(box.width).toBe(44);
    expect(box.height).toBe(44);
    expect(Math.abs(box.x - (card.x + card.width))).toBeLessThanOrEqual(1);
    expect(box.y).toBeGreaterThanOrEqual(stripTop);
    expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height);
  });

  test('tuckedCard_lockButton_showsOnHoverAndToggles', async ({ page }) => {
    await openBoard(
      page,
      fixtureBoard([
        fixtureCard('role', { x: 96, y: 96 }),
        fixtureCard('mechanic', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' }),
      ]),
    );
    const lock = tuckLock(page, 'mechanic-1');
    await expect(lock).toHaveCSS('opacity', '0');
    await expect(tuckLock(page, 'role-1')).toHaveCount(0);
    const card = await boxOf(cardById(page, 'mechanic-1'));
    await page.mouse.move(card.x + 40, card.y + card.height - 20);
    await expect(lock).toHaveCSS('opacity', '1');
    await expect(lock).toHaveAttribute('aria-label', 'Lock');
    await expect(lock.locator('[data-icon]')).toHaveAttribute('data-icon', 'lock-open');
    await lock.click();
    await expect(lock).toHaveAttribute('aria-label', 'Unlock');
    await expect(lock.locator('[data-icon]')).toHaveAttribute('data-icon', 'lock');
    await expect
      .poll(async () => (await storedBoards(page))[0]!.cards.find((c) => c.id === 'mechanic-1'))
      .toMatchObject({ locked: true });
    // The click locks only: it does not select the card.
    await expect(
      page.locator('.react-flow__node[data-id="mechanic-1"] [data-selected]'),
    ).toHaveCount(0);
    // Locked, it stays after the pointer leaves.
    await page.mouse.move(5, 5);
    await expect(lock).toHaveCSS('opacity', '1');
    await page.keyboard.press('Control+z');
    await expect(lock).toHaveAttribute('aria-label', 'Lock');
    await expect(lock).toHaveCSS('opacity', '0');
    await lock.hover();
    await lock.click();
    await lock.click();
    await expect(lock).toHaveAttribute('aria-label', 'Lock');
  });

  test('select_combinedCard_stripHasSplit', async ({ page }) => {
    await openBoard(page, fixtureBoard([combinedCard('role', { x: 96, y: 96 })]));
    await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
    const buttons = page.getByTestId('card-strip').getByRole('button');
    await expect(buttons).toHaveCount(5);
    expect(await buttons.evaluateAll((els) => els.map((el) => el.getAttribute('title')))).toEqual([
      'Split',
      'Redraw',
      'Duplicate',
      'Lock',
      'Discard',
    ]);
  });

  test('strip_hoverCard_showsStripWithoutClick', async ({ page }) => {
    await openBoard(page, stack());
    await expect(page.getByTestId('card-strip')).toHaveCount(0);
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
  });

  test('strip_duplicate_copiesCardBesideAndUndoes', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    await page.getByTestId('card-strip').getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.locator('.react-flow__node [data-card][data-type="setting"]')).toHaveCount(2);
    await expect.poll(async () => (await storedBoards(page))[0]!.cards.length).toBe(5);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node [data-card][data-type="setting"]')).toHaveCount(1);
  });

  test('strip_hoverTuckedCard_showsNoStrip', async ({ page }) => {
    await openBoard(page, stack());
    // The head of the stack shows its strip; the tucked cards below it show none.
    await cardById(page, 'role-1').hover({ position: { x: 100, y: 20 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
    for (const id of ['goal-1', 'conflict-1']) {
      const card = await boxOf(cardById(page, id));
      await page.mouse.move(card.x + card.width / 2, card.y + card.height - 20);
      await page.waitForTimeout(200);
      await expect(page.getByTestId('card-strip')).toHaveCount(0);
    }
  });

  test('strip_pointerLeaves_hidesStripAfter1s', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
    const canvas = await boxOf(page.getByTestId('canvas'));
    await page.mouse.move(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('card-strip')).toBeVisible();
    await expect(page.getByTestId('card-strip')).toHaveCount(0, { timeout: 2000 });
  });

  test('strip_pointerReturnsWithin1s_keepsStrip', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    const canvas = await boxOf(page.getByTestId('canvas'));
    await page.mouse.move(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
    await page.waitForTimeout(500);
    await page.getByTestId('card-strip').getByRole('button', { name: 'Lock' }).hover();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('card-strip')).toBeVisible();
  });

  test('strip_hoverOtherCard_closesFirstAtOnce', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toHaveCount(1);
    await cardById(page, 'role-1').hover({ position: { x: 100, y: 20 } });
    await expect(page.getByTestId('card-strip')).toHaveCount(1, { timeout: 1000 });
  });

  test('strip_pressElsewhere_closesAtOnce', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
    const canvas = await boxOf(page.getByTestId('canvas'));
    await page.mouse.click(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
    await expect(page.getByTestId('card-strip')).toHaveCount(0, { timeout: 1000 });
  });

  test('strip_redraw_keepsPlaceAndTucks', async ({ page }) => {
    await openBoard(page, stack());
    const role = cardById(page, 'role-1');
    const before = await boxOf(role);
    const cuesBefore = await role.locator('[data-edge]').allTextContents();
    await role.click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Redraw' }).click();
    await expect
      .poll(async () => (await role.locator('[data-edge]').allTextContents()).join('|'))
      .not.toBe(cuesBefore.join('|'));
    const after = await boxOf(role);
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    const goal = await boxOf(cardById(page, 'goal-1'));
    expect(Math.abs(goal.y - after.y - 56)).toBeLessThanOrEqual(1);
    await expect(canvasCards(page)).toHaveCount(4);
  });

  test('strip_redrawCombined_keepsAdjectives', async ({ page }) => {
    const card = combinedCard('role', { x: 96, y: 96 });
    const adjectives = card.rings[1]!.cues.map((cue) => cue.text);
    await openBoard(page, fixtureBoard([card]));
    const role = cardById(page, 'role-1');
    const before = await role.locator('[data-edge]').allTextContents();
    await role.click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Redraw' }).click();
    await expect
      .poll(async () => (await role.locator('[data-edge]').allTextContents()).join('|'))
      .not.toBe(before.join('|'));
    // Each edge still starts with its adjective, and the card is still combined.
    const after = await role.locator('[data-edge]').allTextContents();
    for (const text of after) {
      expect(
        adjectives.some((adjective) => text.startsWith(`${adjective} `)),
        text,
      ).toBe(true);
    }
    await expect(role.getByTestId('combined-disc')).toBeVisible();
  });

  test('tuckedCard_typeMark_inCornerAndClearOfCue', async ({ page }) => {
    await openBoard(page, stack());
    await expect(cardById(page, 'role-1').getByTestId('tuck-mark')).toHaveCount(0);
    for (const id of ['goal-1', 'conflict-1']) {
      const card = cardById(page, id);
      const mark = card.getByTestId('tuck-mark');
      const m = await boxOf(mark);
      const c = await boxOf(card);
      expect(m.width).toBe(14);
      // In the bottom-right corner, 4 from each edge (user 2026-11-03).
      expect(Math.abs(c.x + c.width - (m.x + m.width) - 4)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.y + c.height - (m.y + m.height) - 4)).toBeLessThanOrEqual(1);
      // No other card covers the mark (it ignores the pointer, so the hit lands on its own
      // card), and it does not touch the bottom cue.
      const covered = await mark.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !el.closest('[data-card]')!.contains(hit);
      });
      expect(covered, `${id} mark is covered`).toBe(false);
      const cue = await boxOf(card.getByTestId('active-cue'));
      const touch =
        m.x < cue.x + cue.width &&
        cue.x < m.x + m.width &&
        m.y < cue.y + cue.height &&
        cue.y < m.y + m.height;
      expect(touch, `${id} mark touches its cue`).toBe(false);
    }
  });

  test('tuckedGoal_longCue_fitsOnTwoLinesClearOfMarks', async ({ page }) => {
    const rings = [
      {
        cues: [{ text: 'get past the wall and across the water' }, { text: 'reach the summit' }],
        activeIndex: 0,
      },
    ];
    await openBoard(
      page,
      fixtureBoard([
        fixtureCard('role', { x: 96, y: 96 }),
        fixtureCard('goal', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1', locked: true, rings }),
        fixtureCard('goal', { id: 'goal-2', x: 480, y: 96, z: 3, rings }),
      ]),
    );
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['goal-1', 'goal-2']) {
      const cue = cardById(page, id).getByTestId('active-cue');
      // Two 17 px lines, nothing clipped (user 2026-11-03).
      const { client, scroll } = await cue.evaluate((el) => ({
        client: el.clientHeight,
        scroll: el.scrollHeight,
      }));
      expect(client, id).toBeLessThanOrEqual(35);
      expect(scroll - client, `${id} cue is clipped`).toBeLessThanOrEqual(1);
    }
    const goal = cardById(page, 'goal-1');
    const cue = await boxOf(goal.getByTestId('active-cue'));
    for (const mark of [goal.getByTestId('tuck-mark'), tuckLock(page, 'goal-1')]) {
      const m = await boxOf(mark);
      expect(cue.x + cue.width, 'cue clear of the marks').toBeLessThan(m.x);
    }
  });

  test('strip_discard_removesCard', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(cardById(page, 'setting-1')).toHaveCount(0);
    await expect(badge(page)).toHaveText('3 cards · 0 notes');
  });

  test('keys_deleteOnSelected_discards', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    await page.keyboard.press('Delete');
    await expect(cardById(page, 'setting-1')).toHaveCount(0);
  });

  test('keys_rOnSelectedNotHovered_turnsOuterRing', async ({ page }) => {
    await openBoard(page, stack());
    const setting = cardById(page, 'setting-1');
    await setting.click({ position: { x: 30, y: 30 } });
    // Move the pointer off every card so the selected card is the target.
    const canvas = await boxOf(page.getByTestId('canvas'));
    await page.mouse.move(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
    await expect(setting.getByTestId('active-cue')).toHaveText('outpost');
    await page.keyboard.press('r');
    await expect(setting.getByTestId('active-cue')).toHaveText('harbor');
  });
});

test('tokens_shell_rendersAtLockedValues', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard(fixtureStack(96, 96), [fixtureNote({ x: 480, y: 96, text: 'Pitch text' })]),
  );
  const topBar = page.locator('header');
  expect((await boxOf(topBar)).height).toBe(56);
  await expect(topBar).toHaveCSS('background-color', 'rgb(35, 39, 47)');
  expect((await boxOf(rail(page))).width).toBe(232);
  expect(
    (await boxOf(rail(page).getByRole('button', { name: 'Draw A Player Role', exact: true })))
      .height,
  ).toBe(36);
  for (const name of ['Zoom Out', 'Reset Zoom', 'Zoom In', 'Fit']) {
    expect((await boxOf(page.getByRole('button', { name, exact: true }))).height).toBe(44);
  }
  // The note body is note paper, the dark-mode --note-bg (design 9.12, 4.5).
  await expect(page.getByTestId('note')).toHaveCSS('background-color', 'rgb(46, 42, 34)');
  // A tucked Goal: --card-tucked-1, #2A2F38 in dark mode (design 9.7, 4.5).
  expectRgbNear(await backgroundRgb(cardById(page, 'goal-1')), [42, 47, 56]);

  await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
  const selected = page.locator('.react-flow__node[data-id="role-1"] [data-selected]');
  await expect(selected).toHaveCSS('outline-width', '2px');
  await expect(selected).toHaveCSS('outline-color', 'rgb(232, 116, 46)');
});

test('connector_tuckedStack_badgesOnLeftSeam', async ({ page }) => {
  await openBoard(page, fixtureBoard(fixtureStack(96, 96)));
  const badges = page.getByTestId('connector-badge');
  // Nodes paint lowest first, so the deeper badge comes first in the DOM.
  await expect(badges).toHaveText(['but', 'to']);
  const role = await boxOf(cardById(page, 'role-1'));
  const goal = await boxOf(cardById(page, 'goal-1'));
  const wantsTo = await boxOf(badges.filter({ hasText: /^to$/ }));
  // Centered on the left edge, at the seam where the Player Role's bottom edge meets the Goal.
  expect(wantsTo.x + wantsTo.width / 2).toBeCloseTo(goal.x, 0);
  expect(wantsTo.y + wantsTo.height / 2).toBeCloseTo(role.y + role.height, 0);
  await page.screenshot({ path: process.env.SHOT ?? 'test-results/connector.png' });
});

test('connector_conflictUnderRole_but', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('role', { x: 96, y: 96 }),
      fixtureCard('conflict', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' }),
    ]),
  );
  await expect(
    page.locator('.react-flow__node[data-id="role-1"]').getByTestId('connector-badge'),
  ).toHaveText('but');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
});

test('connector_chooseFromList_savesWordAndUndoRestores', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('role', { x: 96, y: 96 }),
      fixtureCard('goal', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' }),
    ]),
  );
  const badge = page.getByTestId('connector-badge');
  await expect(badge).toHaveText('to');
  await badge.click();
  const menu = page.getByTestId('connector-menu');
  const rows = menu.getByRole('menuitemradio');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toHaveAttribute('aria-checked', 'true');
  await expect(rows.first()).toBeFocused();
  // Every row is at least 44 px tall.
  for (const row of await rows.all()) expect((await boxOf(row)).height).toBeGreaterThanOrEqual(44);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

  await rows.filter({ hasText: 'until' }).click();
  await expect(menu).toHaveCount(0);
  await expect(badge).toHaveText('until');
  // The click chose a word: it did not select or move the card.
  await expect(page.locator('.react-flow__node [data-selected]')).toHaveCount(0);
  await expect
    .poll(
      async () => (await storedBoards(page))[0]?.cards.find((c) => c.id === 'goal-1')?.connector,
    )
    .toBe('until');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(badge).toHaveText('to');
});

test('connector_keyboard_arrowsAndEnterChooseEscCloses', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('role', { x: 96, y: 96 }),
      fixtureCard('conflict', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' }),
    ]),
  );
  const badge = page.getByTestId('connector-badge');
  await badge.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('connector-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('connector-menu')).toHaveCount(0);
  await expect(badge).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(badge).toHaveText('while');
});

test('connector_articleWord_anBeforeVowel', async ({ page }) => {
  const lower = fixtureCard('role', {
    id: 'role-2',
    x: 96,
    y: 152,
    z: 2,
    tuckedUnder: 'role-1',
    connector: 'with a',
  });
  // The active cue starts with a vowel, so "with a" shows as "with an".
  lower.rings[0] = {
    ...lower.rings[0]!,
    cues: [{ text: 'archer' }, ...lower.rings[0]!.cues.slice(1)],
  };
  await openBoard(page, fixtureBoard([fixtureCard('role', { x: 96, y: 96 }), lower]));
  await expect(page.getByTestId('connector-badge')).toHaveText('with an');
});
