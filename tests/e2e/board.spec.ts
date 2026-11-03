/**
 * Browser tests for the board screen: the shell, the empty board, drawing onto the canvas,
 * fixture boards, the pools banner, selection and the card strip, keys, and locked tokens.
 */
import type { Route } from '@playwright/test';
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
  await expect(rail(page).getByRole('button', { name: 'Genres' })).toContainText('All genres');
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

test.describe('selection', () => {
  const stack = () =>
    fixtureBoard([...fixtureStack(96, 96), fixtureCard('setting', { x: 480, y: 96, z: 9 })]);

  test('select_clickCard_showsStripAndOutline', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    const strip = page.getByTestId('card-strip');
    await expect(strip).toBeVisible();
    await expect(strip.getByRole('button')).toHaveText(['Redraw', 'Lock', 'Discard']);
    const wrapper = page.locator('.react-flow__node[data-id="setting-1"] [data-selected]');
    await expect(wrapper).toHaveCSS('outline-width', '2px');
    await expect(wrapper).toHaveCSS('outline-color', 'rgb(232, 116, 46)');
    // The strip's bottom sits 56 px above the card (design 9.4).
    const gap =
      (await boxOf(cardById(page, 'setting-1'))).y -
      ((await boxOf(strip)).y + (await boxOf(strip)).height);
    expect(Math.abs(gap - 56)).toBeLessThanOrEqual(1);
  });

  test('strip_lock_marksCardAndUndoes', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    const strip = page.getByTestId('card-strip');
    await strip.getByRole('button', { name: 'Lock' }).click();
    await expect(cardById(page, 'setting-1').getByTestId('lock-mark')).toBeVisible();
    await expect(strip.getByRole('button', { name: 'Unlock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
    for (const part of [mechanic.getByTestId('active-cue'), mechanic.getByTestId('lock-mark')]) {
      const box = await boxOf(part);
      expect(box.y).toBeGreaterThanOrEqual(stripTop);
      expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height);
    }
    expect((await boxOf(mechanic.getByTestId('lock-mark'))).width).toBe(13);
  });

  test('select_combinedCard_stripHasSplit', async ({ page }) => {
    await openBoard(page, fixtureBoard([combinedCard('role', { x: 96, y: 96 })]));
    await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip').getByRole('button')).toHaveText([
      'Split',
      'Redraw',
      'Lock',
      'Discard',
    ]);
  });

  test('select_clickPane_hidesStrip', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
    const canvas = await boxOf(page.getByTestId('canvas'));
    await page.mouse.click(canvas.x + canvas.width - 100, canvas.y + canvas.height - 150);
    await expect(page.getByTestId('card-strip')).toHaveCount(0);
  });

  test('select_escape_hidesStrip', async ({ page }) => {
    await openBoard(page, stack());
    await cardById(page, 'setting-1').click({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('card-strip')).toHaveCount(0);
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

  test('tuckedCard_typeMark_visibleAndClearOfCue', async ({ page }) => {
    await openBoard(page, stack());
    await expect(cardById(page, 'role-1').getByTestId('tuck-mark')).toHaveCount(0);
    for (const id of ['goal-1', 'conflict-1']) {
      const card = cardById(page, id);
      const mark = card.getByTestId('tuck-mark');
      const m = await boxOf(mark);
      const c = await boxOf(card);
      expect(m.width).toBe(14);
      expect(m.x + m.width).toBeLessThanOrEqual(c.x + c.width);
      expect(m.y + m.height).toBeLessThanOrEqual(c.y + c.height);
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
  // The note body is note paper, --note-bg (design 9.12).
  await expect(page.getByTestId('note')).toHaveCSS('background-color', 'rgb(251, 246, 228)');
  // A tucked Goal: the first tucked paper step, --card-tucked-1 (design 9.7).
  expectRgbNear(await backgroundRgb(cardById(page, 'goal-1')), [241, 236, 224]);

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
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
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
