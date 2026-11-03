/**
 * Helpers for the board screen browser tests: open the board (a new one, or a fixture
 * board set before the app starts), create a board through both steps of the New Board
 * dialog, seed a database from an older schema version, draw from the rail, find cards,
 * and drag with stepped mouse moves.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { GENRES, type Board, type CardType, type Genre } from '@/shared/model';
import type { DeckName } from './helpers';

/**
 * Opens the board screen. A given board is passed to the app through the test seam, which
 * saves it to storage once, and opened by its address; without one, New Board on the board
 * list makes a new saved board.
 */
export async function openBoard(page: Page, board?: Board): Promise<void> {
  if (board) {
    await page.addInitScript((b) => {
      window.__GAMEIDEA_E2E_BOARD__ = b;
    }, board);
    await page.goto(`/#/board/${encodeURIComponent(board.id)}`);
  } else {
    await page.goto('/');
    await createBoardWithGenres(page);
    await page.waitForURL(/#\/board\//);
  }
  await expect(page.locator('main[aria-label="Board"]')).toBeVisible();
  await expect(rail(page).getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
}

const GENRE_LABEL: Record<Genre, string> = {
  generic: 'Generic',
  'sci-fi': 'Sci-Fi',
  cyberpunk: 'Cyberpunk',
  'space-opera': 'Space Opera',
};

const DECK_LABEL: Record<CardType, string> = {
  role: 'Player Role',
  goal: 'Goal',
  setting: 'Setting',
  conflict: 'Conflict',
  modifier: 'Modifier',
};

/** The open New Board dialog, on either step (the title changes per step). */
export function newBoardDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: /^(New Board|Decks For ")/ });
}

/**
 * On the board list: clicks New Board and walks both dialog steps.
 * Step 1: fills the "Board Name" field when name is given, then leaves exactly the given
 * genres on (default all 4). Tiles are set last to first, so a sub-genre's Sci-Fi side
 * effect is fixed by Sci-Fi's own later click. Then Next.
 * Step 2: for each deck in decks, in its row clicks the wanted chips that are off, then the
 * unwanted chips that are on (on before off, so the last-chip rule never blocks). Decks not
 * named keep every step 1 genre. Then Create Board.
 */
export async function createBoardWithGenres(
  page: Page,
  options: {
    name?: string;
    genres?: readonly Genre[];
    decks?: Partial<Record<CardType, readonly Genre[]>>;
  } = {},
): Promise<void> {
  const genres = options.genres ?? GENRES;
  await page.getByRole('button', { name: 'New Board' }).click();
  const dialog = newBoardDialog(page);
  if (options.name !== undefined) {
    await dialog.getByRole('textbox', { name: 'Board Name' }).fill(options.name);
  }
  const tiles = dialog.getByRole('group', { name: 'Genres' });
  for (const genre of [...GENRES].reverse()) {
    const tile = tiles.getByRole('button', { name: GENRE_LABEL[genre], exact: true });
    const on = (await tile.getAttribute('aria-pressed')) === 'true';
    if (on !== genres.includes(genre)) await tile.click();
  }
  await dialog.getByRole('button', { name: 'Next' }).click();
  for (const [deck, wanted] of Object.entries(options.decks ?? {}) as [
    CardType,
    readonly Genre[],
  ][]) {
    const row = dialog.getByRole('group', { name: DECK_LABEL[deck] });
    const chip = (genre: Genre) =>
      row.getByRole('button', { name: GENRE_LABEL[genre], exact: true });
    for (const turnOn of [true, false]) {
      for (const genre of genres) {
        if (wanted.includes(genre) !== turnOn) continue;
        const on = (await chip(genre).getAttribute('aria-pressed')) === 'true';
        if (on !== turnOn) await chip(genre).click();
      }
    }
  }
  await dialog.getByRole('button', { name: 'Create Board' }).click();
}

/**
 * Seeds IndexedDB "gameidea" as an older Dexie schema version left it, with one board record
 * and its index row, so the app runs the upgrades on open. Dexie multiplies its version by 10
 * for the native IndexedDB version (schema 1 is native 10, schema 2 is native 20). Call it on
 * a same-origin page that has not opened the database.
 */
export async function seedOldBoard(
  page: Page,
  board: Record<string, unknown>,
  schemaVersion: 1 | 2,
) {
  await page.evaluate(
    async ([record, version]) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('gameidea', version * 10);
        request.onupgradeneeded = () => {
          const upgrading = request.result;
          upgrading.createObjectStore('boards', { keyPath: 'id' });
          const index = upgrading.createObjectStore('boardIndex', { keyPath: 'id' });
          index.createIndex('updatedAt', 'updatedAt');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('open failed'));
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['boards', 'boardIndex'], 'readwrite');
        tx.objectStore('boards').put(record);
        tx.objectStore('boardIndex').put({
          id: record.id,
          name: record.name,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('write failed'));
      });
      db.close();
    },
    [board, schemaVersion] as const,
  );
}

export function rail(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Decks' });
}

/** Clicks "Draw A <deck>" in the rail. */
export async function drawFromRail(page: Page, deck: DeckName): Promise<void> {
  await rail(page)
    .getByRole('button', { name: `Draw A ${deck}` })
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
