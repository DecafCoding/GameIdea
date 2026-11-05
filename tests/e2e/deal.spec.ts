/**
 * Browser tests for Deal Stack (docs/feature-deal-a-stack.html, design 9.5, 9.9, 11) on
 * both board kinds: a full deal on an empty Hook Card is 1 undo step, a partial stack gets
 * only its missing cards in core order, a full stack disables the item until a card is
 * discarded, blocked pools disable it, dealt cards fade in one at a time (at once with
 * reduced motion) with no new-card outline, and Redraw and Redraw All show
 * square-arrow-down. The fixture pools hold only 8 cues per deck, so distinct cues across 3
 * cards of a deck are left to the unit test on the real pools.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card } from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard, storedBoards } from './board-helpers';

const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');
const menu = (page: Page) => page.getByTestId('hook-menu');
const dealButton = (page: Page) => menu(page).getByRole('button', { name: 'Deal Stack' });
const sentence = (page: Page) => page.getByTestId('hook-sentence');
const panel = (page: Page) => page.getByTestId('concept-panel');

const CORE = ['role', 'mechanic', 'resource', 'goal', 'conflict'];

/** Hovers the Hook Card so its menu shows. */
async function openMenu(page: Page) {
  await hookCard(page).hover({ position: { x: 120, y: 40 } });
  await expect(menu(page)).toBeVisible();
}

/** The Hook Card's train in reading order, from a stored board (Modifiers first, then z). */
function train(board: Board): Card[] {
  const hook = board.cards.find((c) => c.type === 'hook')!;
  const out: Card[] = [];
  const visit = (id: string) => {
    const children = board.cards
      .filter((c) => c.tuckedUnder === id)
      .sort(
        (a, b) => (a.type === 'modifier' ? 0 : 1) - (b.type === 'modifier' ? 0 : 1) || a.z - b.z,
      );
    for (const child of children) {
      out.push(child);
      visit(child.id);
    }
  };
  visit(hook.id);
  return out;
}

async function storedOnly(page: Page): Promise<Board> {
  const boards = await storedBoards(page);
  expect(boards).toHaveLength(1);
  return boards[0]!;
}

/** A Free Form board with only a Hook Card. */
function hookOnlyBoard(extra: Card[] = []): Board {
  return {
    ...fixtureBoard([fixtureCard('hook', { x: 96, y: 144 }), ...extra]),
    id: 'deal-board',
    name: 'Deal Board',
  };
}

test.describe('deal', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('deal_emptyFreeFormHook_fullSentenceAndOneUndo', async ({ page }) => {
    await openBoard(page);
    await page.getByRole('button', { name: 'Draw A Hook Card', exact: true }).click();
    await expect(hookCard(page)).toHaveCount(1);
    const empty = await sentence(page).textContent();
    await openMenu(page);
    await dealButton(page).click();
    await expect.poll(async () => train(await storedOnly(page)).map((c) => c.type)).toEqual(CORE);
    await expect(sentence(page)).toHaveText(/^You are a /);
    await expect(sentence(page)).not.toHaveText(empty ?? '');

    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => (await storedOnly(page)).cards.map((c) => c.type))
      .toEqual(['hook']);
  });

  test('deal_emptyOnePagerHook_dealsTrainAndFourteenChips', async ({ page }) => {
    await openBoard(page, undefined, 'One-Pager');
    await openMenu(page);
    await dealButton(page).click();
    await expect.poll(async () => train(await storedOnly(page)).map((c) => c.type)).toEqual(CORE);
    const board = await storedOnly(page);
    const chips = board.cards.filter((c) => c.inConcept);
    expect(chips).toHaveLength(14);
    for (const deck of [
      'role',
      'resource',
      'setting',
      'mood',
      'twist',
      'progression',
      'constraint',
    ]) {
      expect(chips.filter((c) => c.type === deck)).toHaveLength(2);
    }
    await expect(panel(page).getByTestId('concept-chip')).toHaveCount(14);
    await expect(panel(page).getByRole('list')).toHaveCount(7);

    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => (await storedOnly(page)).cards.map((c) => c.type))
      .toEqual(['hook']);
    await expect(panel(page).getByTestId('concept-chip')).toHaveCount(0);
  });

  test('deal_partialStack_fillsOnlyMissing', async ({ page }) => {
    const start = hookOnlyBoard([
      fixtureCard('role', { x: 116, y: 200, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { x: 116, y: 256, z: 3, tuckedUnder: 'role-1' }),
    ]);
    await openBoard(page, start);
    await openMenu(page);
    await dealButton(page).click();
    await expect.poll(async () => train(await storedOnly(page)).map((c) => c.type)).toEqual(CORE);
    const order = train(await storedOnly(page));
    expect(order[0]!.id).toBe('role-1');
    expect(order[3]!.id).toBe('goal-1');
    for (const id of ['role-1', 'goal-1']) {
      const before = start.cards.find((c) => c.id === id)!;
      expect(order.find((c) => c.id === id)!.rings).toEqual(before.rings);
    }
  });

  test('deal_fullStack_disabledUntilACardIsDiscarded', async ({ page }) => {
    await openBoard(page, hookOnlyBoard());
    await openMenu(page);
    await dealButton(page).click();
    await expect(dealButton(page)).toBeDisabled();
    const conflict = train(await storedOnly(page)).find((c) => c.type === 'conflict')!;
    // Click the bottom of the last train card, clear of the Hook Card menu.
    const box = await boxOf(cardById(page, conflict.id));
    await page.mouse.move(box.x + 30, box.y + box.height - 30);
    await page.mouse.click(box.x + 30, box.y + box.height - 30);
    await expect(
      page.locator(`.react-flow__node[data-id="${conflict.id}"] [data-selected]`),
    ).toHaveCount(1);
    await page.keyboard.press('Delete');
    await expect(cardById(page, conflict.id)).toHaveCount(0);
    await openMenu(page);
    await expect(dealButton(page)).toBeEnabled();
  });

  test('deal_poolsBlocked_disabled', async ({ page }) => {
    await page.route('**/pools/*.json', (route) => route.abort());
    const board = hookOnlyBoard();
    await page.addInitScript((b) => {
      window.__GAMEIDEA_E2E_BOARD__ = b;
    }, board);
    await page.goto(`/#/board/${encodeURIComponent(board.id)}`);
    await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
    await openMenu(page);
    await expect(dealButton(page)).toBeDisabled();
  });

  test('deal_menuIcons_squareArrowDownOnRedraws', async ({ page }) => {
    await openBoard(page, hookOnlyBoard([fixtureCard('setting', { x: 480, y: 144, z: 2 })]));
    await openMenu(page);
    await expect(dealButton(page).locator('[data-icon="playing-cards-fan"]')).toHaveCount(1);
    await expect(
      menu(page).getByRole('button', { name: 'Redraw All' }).locator('[data-icon]'),
    ).toHaveAttribute('data-icon', 'square-arrow-down');
    await cardById(page, 'setting-1').hover({ position: { x: 30, y: 30 } });
    const strip = page.getByTestId('card-strip').filter({ visible: true });
    await expect(
      strip.getByRole('button', { name: 'Redraw', exact: true }).locator('[data-icon]'),
    ).toHaveAttribute('data-icon', 'square-arrow-down');
  });
});

test.describe('deal reveal', () => {
  test('deal_reveal_dealtCardsFadeThenSettle', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openBoard(page, hookOnlyBoard());
    await openMenu(page);
    await dealButton(page).click();
    const dealt = page.locator('.react-flow__node [data-dealt]');
    await expect(dealt).toHaveCount(5);
    const rows = await dealt.evaluateAll((els) =>
      els.map((el) => ({
        y: el.getBoundingClientRect().top,
        delay: Number.parseInt(
          (el as HTMLElement).style.getPropertyValue('--deal-delay') || 'NaN',
          10,
        ),
      })),
    );
    rows.sort((a, b) => a.y - b.y);
    expect(rows.map((r) => r.delay)).toEqual([0, 200, 400, 600, 800]);
    for (const card of train(await storedOnly(page))) {
      await expect(cardById(page, card.id)).toHaveCSS('outline-style', 'none');
    }
    await expect(dealt).toHaveCount(0, { timeout: 3000 });
  });
});

test.describe('deal reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('deal_reducedMotion_showsAtOnce', async ({ page }) => {
    await openBoard(page, hookOnlyBoard());
    await openMenu(page);
    await dealButton(page).click();
    const last = page.locator('.react-flow__node [data-dealt]').last();
    await expect(last).toHaveCount(1);
    await expect(last).toHaveCSS('animation-name', 'none');
    await expect(last).toHaveCSS('opacity', '1');
  });
});

test(
  'perf_dealStack_onePagerUpdatesHookUnder100ms',
  { tag: '@timing' },
  async ({ page, browserName }) => {
    // The same limits as the other timing tests: WebKit temporarily at 300 ms (user, 2026-11-04).
    const limit = browserName === 'webkit' ? 300 : 100;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openBoard(page, undefined, 'One-Pager');
    await page.evaluate(() => document.fonts.ready);
    // Warm the engine with one deal and its undo first.
    const empty = await sentence(page).textContent();
    await openMenu(page);
    await dealButton(page).click();
    await expect(sentence(page)).not.toHaveText(empty ?? '');
    await page.keyboard.press('Control+z');
    await expect(sentence(page)).toHaveText(empty ?? '');
    await openMenu(page);
    const result = await page.evaluate(async () => {
      const hook = document.querySelector('[data-testid="hook-sentence"]')!;
      const button = document.querySelector<HTMLButtonElement>(
        '[data-testid="hook-menu"] [aria-label="Deal Stack"]',
      )!;
      const before = hook.textContent;
      const start = performance.now();
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { elapsed: performance.now() - start, changed: hook.textContent !== before };
    });
    expect(result.changed).toBe(true);
    expect(result.elapsed).toBeLessThan(limit);
  },
);
