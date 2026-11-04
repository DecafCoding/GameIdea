/**
 * Browser tests for the Hook Card (design 9.5, 9.6, 9.7, 9.9, 9.13) on the fixture pools:
 * a full core stack built from the rail with the tuck hints, badge words, the selectable
 * sentence, the icon menu, Copy Hook and its fallback, Redraw All, Duplicate, the
 * cannot-tuck notice and Discard. The clipboard is stubbed in the page, because clipboard
 * permissions exist only in Chromium.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card } from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, cardById, dragTo, drawFromRail, openBoard, storedBoards } from './board-helpers';
import type { DeckName } from './helpers';

declare global {
  interface Window {
    __copied?: string;
  }
}

/** Stubs navigator.clipboard.writeText: it stores the text, or rejects when blocked. */
async function stubClipboard(page: Page, blocked = false) {
  await page.addInitScript((block) => {
    const writeText = (text: string) => {
      if (block) return Promise.reject(new Error('NotAllowedError'));
      window.__copied = text;
      return Promise.resolve();
    };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  }, blocked);
}

const sentence = (page: Page) => page.getByTestId('hook-sentence');
const menu = (page: Page) => page.getByTestId('hook-menu');
const hookCard = (page: Page) => page.locator('.react-flow__node [data-card][data-type="hook"]');

/** A Hook Card with a Player Role, a Mechanic and a Goal tucked in order. */
function hookBoard(extra: Card[] = []): Board {
  return {
    ...fixtureBoard([
      fixtureCard('hook', { x: 96, y: 144 }),
      fixtureCard('role', { x: 116, y: 200, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('mechanic', { x: 116, y: 256, z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { x: 116, y: 312, z: 4, tuckedUnder: 'mechanic-1' }),
      ...extra,
    ]),
    id: 'hook-board',
    name: 'Hook Board',
  };
}

const HOOK_TEXT = 'You are a navigator who must trade to keep the light on.';

/** Hovers the Hook Card so its menu shows. */
async function openMenu(page: Page) {
  await hookCard(page).hover({ position: { x: 120, y: 40 } });
  await expect(menu(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('hook_fullCoreStack_showsSentenceAndHints', async ({ page }) => {
  await openBoard(page, {
    ...fixtureBoard([]),
    id: 'empty-board',
    view: { panX: 0, panY: 0, zoom: 0.6 },
  });
  await drawFromRail(page, 'Hook Card');
  await expect(hookCard(page)).toHaveCount(1);
  await expect(page.getByTestId('hook-slot')).toHaveText('Player Role goes here');

  const decks: [DeckName, string][] = [
    ['Player Role', 'role'],
    ['Mechanic', 'mechanic'],
    ['Resource', 'resource'],
    ['Goal', 'goal'],
    ['Conflict', 'conflict'],
  ];
  let bottom = hookCard(page);
  const cues: string[] = [];
  for (const [deck, type] of decks) {
    await drawFromRail(page, deck);
    const card = page.locator(`.react-flow__node [data-card][data-type="${type}"]`);
    await expect(card).toHaveCount(1);
    // Into the slot band under the stack's bottom card.
    const target = await boxOf(bottom);
    const to = { x: target.x + target.width / 2, y: target.y + target.height + 12 };
    await dragTo(page, card, to, { x: 20, y: 20 }, false);
    await expect(page.getByTestId('hint-slot')).toHaveText(`${deck} goes here`);
    await page.mouse.up();
    await expect(page.getByTestId('hint-slot')).toHaveCount(0);
    cues.push((await card.getByTestId('active-cue').textContent())!);
    bottom = card;
  }
  await expect(page.getByTestId('hook-slot')).toHaveCount(0);
  const text = (await sentence(page).textContent())!;
  expect(text).toMatch(/^You are an? /);
  let from = 0;
  for (const cue of cues) {
    const at = text.indexOf(cue, from);
    expect(at, `${cue} in "${text}"`).toBeGreaterThanOrEqual(from);
    from = at + cue.length;
  }

  // A ring turn on the Mechanic updates the sentence.
  const mechanic = await boxOf(page.locator('.react-flow__node [data-card][data-type="mechanic"]'));
  await page.mouse.move(mechanic.x + mechanic.width / 2, mechanic.y + mechanic.height - 10);
  await page.keyboard.press('r');
  await expect(sentence(page)).not.toHaveText(text);
});

test('hook_badgeWord_changesSentenceAndUndoes', async ({ page }) => {
  await openBoard(page, hookBoard());
  await expect(sentence(page)).toHaveText(HOOK_TEXT);
  await page.getByRole('button', { name: 'Connector: who must' }).click();
  await page.getByRole('menuitemradio', { name: /who learns to/ }).click();
  await expect(sentence(page)).toHaveText(
    'You are a navigator who learns to trade to keep the light on.',
  );
  await page.keyboard.press('Control+z');
  await expect(sentence(page)).toHaveText(HOOK_TEXT);
});

test('hook_sentence_selectsForCopyWithoutMovingCard', async ({ page }) => {
  await openBoard(page, hookBoard());
  const before = await boxOf(hookCard(page));
  const text = await boxOf(sentence(page));
  await page.mouse.move(text.x + 2, text.y + 4);
  await page.mouse.down();
  await page.mouse.move(text.x + text.width - 2, text.y + text.height - 4, { steps: 8 });
  await page.mouse.up();
  await sentence(page).click({ clickCount: 3 });
  expect((await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim()).toBe(
    HOOK_TEXT,
  );
  expect(await boxOf(hookCard(page))).toEqual(before);
});

test('hook_copy_putsPlainSentenceOnClipboard', async ({ page }) => {
  await stubClipboard(page);
  await openBoard(page, hookBoard());
  await openMenu(page);
  await menu(page).getByRole('button', { name: 'Copy Hook' }).click();
  await expect(menu(page).getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => window.__copied)).toBe(HOOK_TEXT);
  // After 2 seconds it reads "Copy Hook" again (read whether or not the pointer still hovers).
  await expect(menu(page).locator('button').first()).toHaveAttribute('aria-label', 'Copy Hook', {
    timeout: 4000,
  });
});

test('hook_copyBlocked_showsSelectedFallback', async ({ page }) => {
  await stubClipboard(page, true);
  await openBoard(page, hookBoard());
  await openMenu(page);
  await menu(page).getByRole('button', { name: 'Copy Hook' }).click();
  const dialog = page.getByRole('dialog', { name: 'Copy The Hook' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    'The browser blocked the copy. The text is selected. Press Ctrl+C.',
  );
  const field = dialog.getByRole('textbox', { name: 'Hook Sentence' });
  await expect(field).toHaveValue(HOOK_TEXT);
  const selection = await field.evaluate((el: HTMLTextAreaElement) => [
    el.selectionStart,
    el.selectionEnd,
  ]);
  expect(selection).toEqual([0, HOOK_TEXT.length]);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
});

test('hook_menu_hasIconItems', async ({ page }) => {
  await openBoard(page, hookBoard());
  await openMenu(page);
  const items = menu(page).getByRole('button');
  await expect(items).toHaveCount(4);
  expect(await items.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))).toEqual([
    'Copy Hook',
    'Redraw All',
    'Duplicate',
    'Discard',
  ]);
});

test('hook_redrawAll_skipsLockedAndUndoesInOneStep', async ({ page }) => {
  const board = hookBoard();
  board.cards = board.cards.map((c) => (c.id === 'role-1' ? { ...c, locked: true } : c));
  await openBoard(page, board);
  const before = (await storedBoards(page))[0]!.cards;
  await openMenu(page);
  await menu(page).getByRole('button', { name: 'Redraw All' }).click();
  // Every redrawn card shows the outline, then loses it after 1 second.
  for (const id of ['mechanic-1', 'goal-1']) {
    await expect(cardById(page, id)).toHaveCSS('outline-style', 'solid');
  }
  await expect(cardById(page, 'role-1')).toHaveCSS('outline-style', 'none');
  await expect(cardById(page, 'mechanic-1')).toHaveCSS('outline-style', 'none', { timeout: 3000 });
  const after = (await storedBoards(page))[0]!.cards;
  const role = (cards: Card[]) => cards.find((c) => c.id === 'role-1');
  expect(role(after)).toEqual(role(before));
  for (const id of ['mechanic-1', 'goal-1']) {
    const a = after.find((c) => c.id === id)!;
    const b = before.find((c) => c.id === id)!;
    expect({ ...a, rings: [] }).toEqual({ ...b, rings: [] });
  }

  // One undo restores every card.
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await storedBoards(page))[0]!.cards).toEqual(before);
});

test('hook_duplicate_copiesWholeStackWithSameSentence', async ({ page }) => {
  await openBoard(page, hookBoard());
  await openMenu(page);
  await menu(page).getByRole('button', { name: 'Duplicate' }).click();
  await expect(hookCard(page)).toHaveCount(2);
  await expect(sentence(page)).toHaveText([HOOK_TEXT, HOOK_TEXT]);
  await expect.poll(async () => (await storedBoards(page))[0]!.cards.length).toBe(8);
  await page.keyboard.press('Control+z');
  await expect(hookCard(page)).toHaveCount(1);
});

test('hook_wheelOverCard_scrollsTextNotZoom', async ({ page }) => {
  await openBoard(page, hookBoard());
  const viewport = page.locator('.react-flow__viewport');
  const before = await viewport.getAttribute('style');
  // Make the sentence long enough to scroll.
  await sentence(page).evaluate((el) => {
    el.textContent = 'You are a navigator who must trade to keep the light on. '.repeat(12);
  });
  const header = await boxOf(hookCard(page).locator('header'));
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => sentence(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const text = await boxOf(sentence(page));
  await page.mouse.move(text.x + text.width / 2, text.y + text.height / 2);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  expect(await viewport.getAttribute('style')).toBe(before);
});

test('hook_dropOnCard_refusesTuckWithNotice', async ({ page }) => {
  await openBoard(page, {
    ...fixtureBoard([
      fixtureCard('hook', { x: 96, y: 144 }),
      fixtureCard('setting', { x: 480, y: 144, z: 2 }),
    ]),
    id: 'hook-drop',
  });
  const setting = await boxOf(cardById(page, 'setting-1'));
  await dragTo(page, hookCard(page), { x: setting.x + 100, y: setting.y + 100 });
  const banner = page.getByRole('alert');
  await expect(banner).toContainText(
    'A Hook Card is always the head of its stack. It cannot tuck under a card.',
  );
  await expect
    .poll(async () => (await storedBoards(page))[0]!.cards.find((c) => c.id === 'hook-1'))
    .toMatchObject({ tuckedUnder: null });
  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('hook_discard_freesStackAndUndoes', async ({ page }) => {
  await openBoard(page, hookBoard());
  await openMenu(page);
  await menu(page).getByRole('button', { name: 'Discard' }).click();
  await expect(hookCard(page)).toHaveCount(0);
  await expect(cardById(page, 'role-1')).toBeVisible();
  await expect
    .poll(async () => (await storedBoards(page))[0]!.cards.find((c) => c.id === 'role-1'))
    .toMatchObject({ tuckedUnder: null });
  await page.keyboard.press('Control+z');
  await expect(hookCard(page)).toHaveCount(1);
  await expect(sentence(page)).toHaveText(HOOK_TEXT);
});

test('perf_ringTurn_updatesHookUnder100ms', { tag: '@timing' }, async ({ page, browserName }) => {
  // WebKit limit temporarily raised from 100 to 300 ms by the user's decision on 2026-11-04,
  // pending a perf fix (CI WebKit measured 136–231 ms after Phase 6). Chromium and Firefox keep 100.
  const limit = browserName === 'webkit' ? 300 : 100;
  await openBoard(page, hookBoard());
  await page.evaluate(() => document.fonts.ready);
  // Warm the engine with one turn first.
  const mechanic = cardById(page, 'mechanic-1');
  await mechanic.hover({ position: { x: 120, y: 180 } });
  await page.keyboard.press('r');
  await expect(sentence(page)).not.toHaveText(HOOK_TEXT);
  const result = await page.evaluate(async () => {
    const hook = document.querySelector('[data-testid="hook-sentence"]')!;
    const ring = document.querySelector<HTMLButtonElement>(
      '.react-flow__node[data-id="mechanic-1"] [aria-label="Turn Cues Right"]',
    )!;
    const before = hook.textContent;
    const start = performance.now();
    ring.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { elapsed: performance.now() - start, changed: hook.textContent !== before };
  });
  expect(result.changed).toBe(true);
  expect(result.elapsed).toBeLessThan(limit);
});
