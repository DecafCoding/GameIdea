/**
 * Helpers for the board screen browser tests: open the board (a new one, or a fixture
 * board set before the app starts), create a board through the New Board dialog, draw from
 * the rail, find cards, and drag with stepped mouse moves.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from './test';
import type { Board, Card } from '@/shared/model';
import type { DeckName } from './helpers';

/**
 * Opens the board screen. A given board is passed to the app through the test seam, which
 * saves it to storage once, and opened by its address; without one, New Board on the board
 * list makes a new saved board of the given kind (default Free Form).
 */
export async function openBoard(
  page: Page,
  board?: Board,
  kind: BoardKindName = 'Free Form',
): Promise<void> {
  if (board) {
    await page.addInitScript((b) => {
      window.__GAMEIDEA_E2E_BOARD__ = b;
    }, board);
    await page.goto(`/#/board/${encodeURIComponent(board.id)}`);
  } else {
    await page.goto('/');
    await createBoard(page, 'Test Board', kind);
    await page.waitForURL(/#\/board\//);
  }
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
  await expect(
    rail(page).getByRole('button', { name: 'Draw A Player Role', exact: true }),
  ).toBeEnabled();
}

/** The open New Board dialog. */
export function newBoardDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New Board' });
}

/** A board kind as the New Board dialog names it. */
export type BoardKindName = 'Free Form' | 'One-Pager';

/**
 * On the board list: clicks New Board, types the name, picks the kind when it is not the
 * default (Free Form) and clicks Make Board.
 */
export async function createBoard(
  page: Page,
  name = 'Test Board',
  kind: BoardKindName = 'Free Form',
): Promise<void> {
  await page.getByRole('button', { name: 'New Board' }).first().click();
  const dialog = newBoardDialog(page);
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
  if (kind !== 'Free Form') await dialog.getByRole('radio', { name: kind }).click();
  await dialog.getByRole('button', { name: 'Make Board' }).click();
}

export function rail(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Decks' });
}

/** Clicks "Draw A <deck>" in the rail. */
export async function drawFromRail(page: Page, deck: DeckName): Promise<void> {
  await rail(page)
    .getByRole('button', { name: `Draw A ${deck}`, exact: true })
    .click();
}

/** The card element of the node with this id. */
export function cardById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__node[data-id="${id}"] [data-card]`);
}

/** All cards on the canvas (not the draw-motion copies). */
export function canvasCards(page: Page): Locator {
  return page.locator('.react-flow__node [data-card]');
}

export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('The element has no box.');
  return box;
}

/**
 * Drags from a point on the locator (default its top-left area, clear of the rings) by
 * dx, dy with stepped mouse moves. Leaves the mouse up.
 */
export async function dragBy(
  page: Page,
  locator: Locator,
  dx: number,
  dy: number,
  from: { x: number; y: number } = { x: 30, y: 30 },
): Promise<void> {
  const box = await boxOf(locator);
  const x = box.x + from.x;
  const y = box.y + from.y;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
}

/** Drags so that the pointer ends at the page point. */
export async function dragTo(
  page: Page,
  locator: Locator,
  to: { x: number; y: number },
  from: { x: number; y: number } = { x: 30, y: 30 },
  release = true,
): Promise<void> {
  const box = await boxOf(locator);
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  if (release) await page.mouse.up();
}

/** The card type under a page point, read from the closest [data-card]. */
export async function typeAt(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(
    ([px, py]) =>
      document.elementFromPoint(px!, py!)?.closest('[data-card]')?.getAttribute('data-type') ??
      null,
    [x, y],
  );
}

/** The node id under a page point. */
export async function nodeIdAt(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(
    ([px, py]) =>
      document.elementFromPoint(px!, py!)?.closest('.react-flow__node')?.getAttribute('data-id') ??
      null,
    [x, y],
  );
}

/** Every board record stored in IndexedDB, read raw in the page, sorted by id. */
export async function storedBoards(page: Page): Promise<Board[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gameidea');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('open failed'));
    });
    const records = await new Promise<Board[]>((resolve, reject) => {
      const request = db.transaction('boards').objectStore('boards').getAll();
      request.onsuccess = () => resolve(request.result as Board[]);
      request.onerror = () => reject(new Error('read failed'));
    });
    db.close();
    return records.sort((a, b) => (a.id < b.id ? -1 : 1));
  });
}

/**
 * Waits until the stored record of a board has a card that satisfies the predicate, so a
 * reload right after a change cannot beat the save. The save mark alone is not enough: it
 * can still read "saved" from the save before the change.
 */
export async function waitForStoredCard(
  page: Page,
  boardId: string,
  cardId: string,
  predicate: (card: Card) => boolean = () => true,
  timeout = 5000,
): Promise<Card> {
  let found: Card | undefined;
  await expect
    .poll(
      async () => {
        const board = (await storedBoards(page)).find((b) => b.id === boardId);
        const card = board?.cards.find((c) => c.id === cardId);
        found = card && predicate(card) ? card : undefined;
        return found !== undefined;
      },
      { timeout },
    )
    .toBe(true);
  return found!;
}
