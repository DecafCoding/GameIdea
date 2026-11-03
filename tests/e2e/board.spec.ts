/**
 * Browser tests for the board screen: the shell, the empty board, drawing onto the canvas,
 * fixture boards, the pools banner, selection and the card strip, keys, and locked tokens.
 */
import { expect, test } from '@playwright/test';
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
  createBoardWithGenres,
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
  await expect(page.getByRole('textbox', { name: 'Board Name' })).toHaveValue('Untitled Board');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByTestId('zoom-strip')).toBeVisible();
});

test('board_drawFromPanel_hidesPanelAndCountsOne', async ({ page }) => {
  await openBoard(page);
  const panel = page.getByRole('region', { name: 'Start With One Card' });
  await panel.getByRole('button', { name: 'Draw A Character' }).click();
  await expect(canvasCards(page)).toHaveCount(1);
  await expect(canvasCards(page).first()).toHaveAttribute('data-type', 'character');
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
  const decks: DeckName[] = ['Character', 'Motivation', 'Setting', 'Conflict', 'Description'];
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
  await page.route('**/pools/*.json', (route) => route.abort());
  await page.goto('/');
  await createBoardWithGenres(page);
  const alert = page.getByRole('alert');
  await expect(alert).toContainText(POOLS_FAILED_TEXT);
  for (const button of await rail(page)
    .getByRole('button', { name: /^Draw A / })
    .all()) {
    await expect(button).toBeDisabled();
  }
  await page.unroute('**/pools/*.json');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toHaveCount(0);
  await drawFromRail(page, 'Conflict');
  await expect(canvasCards(page)).toHaveCount(1);
});

test('board_drawAndTurn_under100ms', { tag: '@timing' }, async ({ page }) => {
  // Warm the engine with one draw, then measure on a fresh page (see card-test.spec.ts).
  await openBoard(page);
  await drawFromRail(page, 'Character');
  await page.reload();
  await expect(rail(page).getByRole('button', { name: 'Draw A Character' })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const drawResult = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>(
      'aside [aria-label="Draw A Character"]',
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
    await openBoard(page, fixtureBoard([combinedCard('character', { x: 96, y: 96 })]));
    await cardById(page, 'character-1').click({ position: { x: 30, y: 30 } });
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
    const character = cardById(page, 'character-1');
    const before = await boxOf(character);
    const cuesBefore = await character.locator('[data-edge]').allTextContents();
    await character.click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Redraw' }).click();
    await expect
      .poll(async () => (await character.locator('[data-edge]').allTextContents()).join('|'))
      .not.toBe(cuesBefore.join('|'));
    const after = await boxOf(character);
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    const motivation = await boxOf(cardById(page, 'motivation-1'));
    expect(Math.abs(motivation.y - after.y - 59)).toBeLessThanOrEqual(1);
    await expect(canvasCards(page)).toHaveCount(4);
  });

  test('strip_redrawCombined_keepsAdjectives', async ({ page }) => {
    const card = combinedCard('character', { x: 96, y: 96 });
    const adjectives = card.rings[1]!.cues.map((cue) => cue.text);
    await openBoard(page, fixtureBoard([card]));
    const character = cardById(page, 'character-1');
    const before = await character.locator('[data-edge]').allTextContents();
    await character.click({ position: { x: 30, y: 30 } });
    await page.getByRole('button', { name: 'Redraw' }).click();
    await expect
      .poll(async () => (await character.locator('[data-edge]').allTextContents()).join('|'))
      .not.toBe(before.join('|'));
    // Each edge still starts with its adjective, and the card is still combined.
    const after = await character.locator('[data-edge]').allTextContents();
    for (const text of after) {
      expect(
        adjectives.some((adjective) => text.startsWith(`${adjective} `)),
        text,
      ).toBe(true);
    }
    await expect(character.getByTestId('combined-disc')).toBeVisible();
  });

  test('tuckedCard_typeMark_visibleAndClearOfCue', async ({ page }) => {
    await openBoard(page, stack());
    await expect(cardById(page, 'character-1').getByTestId('tuck-mark')).toHaveCount(0);
    for (const id of ['motivation-1', 'conflict-1']) {
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
    fixtureBoard(fixtureStack(96, 96), [fixtureNote({ x: 480, y: 96, text: 'Premise text' })]),
  );
  const topBar = page.locator('header');
  expect((await boxOf(topBar)).height).toBe(56);
  await expect(topBar).toHaveCSS('background-color', 'rgb(35, 39, 47)');
  expect((await boxOf(rail(page))).width).toBe(240);
  expect((await boxOf(rail(page).getByRole('button', { name: 'Draw A Character' }))).height).toBe(
    56,
  );
  for (const name of ['Zoom Out', 'Reset Zoom', 'Zoom In', 'Fit']) {
    expect((await boxOf(page.getByRole('button', { name, exact: true }))).height).toBe(44);
  }
  // The note body is white; its header band keeps --paper-note.
  await expect(page.getByTestId('note')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  // A tucked Motivation: 14 percent of --type-motivation mixed into --paper-under-1.
  expectRgbNear(await backgroundRgb(cardById(page, 'motivation-1')), [214, 223, 211]);

  await cardById(page, 'character-1').click({ position: { x: 30, y: 30 } });
  const selected = page.locator('.react-flow__node[data-id="character-1"] [data-selected]');
  await expect(selected).toHaveCSS('outline-width', '2px');
  await expect(selected).toHaveCSS('outline-color', 'rgb(232, 116, 46)');
});

test('connector_tuckedStack_badgesOnLeftSeam', async ({ page }) => {
  await openBoard(page, fixtureBoard(fixtureStack(96, 96)));
  const badges = page.getByTestId('connector-badge');
  // Nodes paint lowest first, so the deeper badge comes first in the DOM.
  await expect(badges).toHaveText(['but', 'wants to']);
  const character = await boxOf(cardById(page, 'character-1'));
  const motivation = await boxOf(cardById(page, 'motivation-1'));
  const wantsTo = await boxOf(badges.filter({ hasText: 'wants to' }));
  // Centered on the left edge, at the seam where the Character's bottom edge meets the Motivation.
  expect(wantsTo.x + wantsTo.width / 2).toBeCloseTo(motivation.x, 0);
  expect(wantsTo.y + wantsTo.height / 2).toBeCloseTo(character.y + character.height, 0);
  await page.screenshot({ path: process.env.SHOT ?? 'test-results/connector.png' });
});

test('connector_tuckedSetting_wordFollowsActiveNounKind', async ({ page }) => {
  // Fixture Setting kinds by index: place, object, event, place.
  const settingAt = (activeIndex: number, suffix: string, x: number) => {
    const setting = fixtureCard('setting', {
      id: `setting-${suffix}`,
      x,
      y: 155,
      z: 2,
      tuckedUnder: `character-${suffix}`,
    });
    setting.rings[0] = { ...setting.rings[0]!, activeIndex };
    return [fixtureCard('character', { id: `character-${suffix}`, x, y: 96 }), setting];
  };
  await openBoard(
    page,
    fixtureBoard([...settingAt(0, '1', 96), ...settingAt(1, '2', 400), ...settingAt(2, '3', 704)]),
  );
  const badgeOf = (id: string) =>
    page.locator(`.react-flow__node[data-id="${id}"]`).getByTestId('connector-badge');
  await expect(badgeOf('character-1')).toHaveText('in the');
  await expect(badgeOf('character-2')).toHaveText('with the');
  await expect(badgeOf('character-3')).toHaveText('from the');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
});

test('connector_conflictUnderCharacter_but', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('character', { x: 96, y: 96 }),
      fixtureCard('conflict', { x: 96, y: 155, z: 2, tuckedUnder: 'character-1' }),
    ]),
  );
  await expect(
    page.locator('.react-flow__node[data-id="character-1"]').getByTestId('connector-badge'),
  ).toHaveText('but');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
});

test('connector_chooseFromList_savesWordAndUndoRestores', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('character', { x: 96, y: 96 }),
      fixtureCard('motivation', { x: 96, y: 155, z: 2, tuckedUnder: 'character-1' }),
    ]),
  );
  const badge = page.getByTestId('connector-badge');
  await expect(badge).toHaveText('wants to');
  await badge.click();
  const menu = page.getByTestId('connector-menu');
  const rows = menu.getByRole('menuitemradio');
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toHaveAttribute('aria-checked', 'true');
  await expect(rows.first()).toBeFocused();
  // Every row is at least 44 px tall.
  for (const row of await rows.all()) expect((await boxOf(row)).height).toBeGreaterThanOrEqual(44);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

  await rows.filter({ hasText: 'refuses to' }).click();
  await expect(menu).toHaveCount(0);
  await expect(badge).toHaveText('refuses to');
  // The click chose a word: it did not select or move the card.
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await storedBoards(page))[0]?.cards.find((c) => c.id === 'motivation-1')?.connector,
    )
    .toBe('refuses to');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(badge).toHaveText('wants to');
});

test('connector_keyboard_arrowsAndEnterChooseEscCloses', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([
      fixtureCard('character', { x: 96, y: 96 }),
      fixtureCard('conflict', { x: 96, y: 155, z: 2, tuckedUnder: 'character-1' }),
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
  await expect(badge).toHaveText('until');
});

test('connector_articleWord_anBeforeVowel', async ({ page }) => {
  const setting = fixtureCard('setting', {
    x: 96,
    y: 155,
    z: 2,
    tuckedUnder: 'character-1',
    connector: 'in a',
  });
  // Fixture place nouns: outpost (index 0) starts with a vowel.
  await openBoard(page, fixtureBoard([fixtureCard('character', { x: 96, y: 96 }), setting]));
  await expect(page.getByTestId('connector-badge')).toHaveText('in an');
});
