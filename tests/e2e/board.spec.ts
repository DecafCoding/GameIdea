/**
 * Browser tests for the board screen: the shell, the empty board, drawing onto the canvas,
 * fixture boards, the pools banner, selection and the card strip, keys, and locked tokens.
 */
import type { Route } from '@playwright/test';
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
  'The decks did not load. Saved cards still work. Drawing is off until the decks load.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const badge = (page: import('@playwright/test').Page) => page.getByTestId('count-badge');

test('board_emptyBoard_showsPanelAndZeroCounts', async ({ page }) => {
  await openBoard(page);
  await expect(page).toHaveURL(/#\/board\/[\w-]+$/);
  await expect(page.getByRole('heading', { name: 'Start With One Card' })).toBeVisible();
  await expect(badge(page)).toHaveText('0 cards · 0 notes');
  await expect(page.getByRole('link', { name: 'Board List' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Board Name' })).toHaveValue('Test Board');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByTestId('zoom-strip')).toBeVisible();
});

test('board_drawFromPanel_hidesPanelAndCountsOne', async ({ page }) => {
  await openBoard(page);
  const panel = page.getByRole('region', { name: 'Start With One Card' });
  await panel.getByRole('button', { name: 'Draw A Player Role', exact: true }).click();
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(canvasCards(page).first()).toHaveAttribute('data-type', 'role');
  await expect(panel).toHaveCount(0);
  await expect(badge(page)).toHaveText('1 card · 0 notes');

  // The panel does not come back for this board, even when it empties.
  await canvasCards(page)
    .first()
    .click({ position: { x: 30, y: 30 } });
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(canvasCards(page)).toHaveCount(0);
  await expect(panel).toHaveCount(0);
});

test('board_drawEachDeck_cardsDoNotOverlap', async ({ page }) => {
  await openBoard(page);
  const decks: DeckName[] = ['Player Role', 'Goal', 'Conflict', 'Modifier', 'Setting'];
  for (const deck of decks) await drawFromRail(page, deck);
  await expect(canvasCards(page)).toHaveCount(5);
  await expect(badge(page)).toHaveText('5 cards · 0 notes');
  const boxes = await Promise.all((await canvasCards(page).all()).map((c) => boxOf(c)));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
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
  await expect(page.getByRole('heading', { name: 'Start With One Card' })).toHaveCount(0);
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
    await expect(button).toBeDisabled();
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
    await expect(strip.getByRole('button')).toHaveText(['Redraw', 'Discard']);
    const wrapper = page.locator('.react-flow__node[data-id="setting-1"] [data-selected]');
    await expect(wrapper).toHaveCSS('outline-width', '2px');
    await expect(wrapper).toHaveCSS('outline-color', 'rgb(232, 116, 46)');
    // The strip sits above the card.
    expect((await boxOf(strip)).y + (await boxOf(strip)).height).toBeLessThanOrEqual(
      (await boxOf(cardById(page, 'setting-1'))).y,
    );
  });

  test('select_combinedCard_stripHasSplit', async ({ page }) => {
    await openBoard(page, fixtureBoard([combinedCard('role', { x: 96, y: 96 })]));
    await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
    await expect(page.getByTestId('card-strip').getByRole('button')).toHaveText([
      'Split',
      'Redraw',
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
