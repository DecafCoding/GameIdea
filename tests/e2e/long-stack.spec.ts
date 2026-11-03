/**
 * The long-stack check (canvas-library and nfr-targets in docs/architecture.html): an
 * 11-card stack in one parent chain, with a Hook Card at its root, moves as one stack in
 * every engine, a drag is one undo step, and in Chromium the drag runs at 50 frames per
 * second or more.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { HOOK_INSET, stack11Board, TUCK } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard } from './board-helpers';
import { pacedDrag } from './frames';

const ZOOM = stack11Board().view.zoom;

/**
 * The React Flow node wrapper of a card. During a drag the lifted card is scaled and
 * turned (design 9.7), so its own box is not its position; the wrapper is.
 */
function nodeById(page: Page, id: string) {
  return page.locator(`.react-flow__node[data-id="${id}"]`);
}

test.describe('Long stack', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openBoard(page, stack11Board());
  });

  test('longStack_dragRoot_wholeStackMovesAndDropsOnce', async ({ page }) => {
    const tuck = TUCK * ZOOM;
    const start = await boxOf(cardById(page, 'long-0'));
    const rootNode = await boxOf(nodeById(page, 'long-0'));
    const tail = await boxOf(nodeById(page, 'long-10'));
    const from = { x: start.x + 12, y: start.y + 12 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 180, from.y + 40, { steps: 15 });

    const root = await boxOf(nodeById(page, 'long-0'));
    const movedTail = await boxOf(nodeById(page, 'long-10'));
    expect(Math.abs(movedTail.x - tail.x - (root.x - rootNode.x))).toBeLessThanOrEqual(1);
    expect(Math.abs(movedTail.y - tail.y - (root.y - rootNode.y))).toBeLessThanOrEqual(1);
    await page.mouse.up();

    const dropped = await boxOf(cardById(page, 'long-0'));
    for (let i = 1; i <= 10; i++) {
      const box = await boxOf(cardById(page, `long-${i}`));
      // Under the Hook Card every stack card sits 20 px in from its left edge.
      expect(Math.abs(box.x - dropped.x - HOOK_INSET * ZOOM)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y - dropped.y - i * tuck)).toBeLessThanOrEqual(1);
    }
    expect(dropped.x - start.x).toBeGreaterThan(100);

    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => {
        const back = await boxOf(cardById(page, 'long-0'));
        return Math.abs(back.x - start.x) <= 1 && Math.abs(back.y - start.y) <= 1;
      })
      .toBe(true);
  });
});

test.describe('Long stack frame rate', { tag: '@timing' }, () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'The trace target is Chromium only.');

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openBoard(page, stack11Board());
  });

  test('perf_dragLongStack_atLeast50Fps', async ({ page }) => {
    const root = await boxOf(cardById(page, 'long-0'));
    const tail = await boxOf(nodeById(page, 'long-10'));
    const fps = await pacedDrag(page, { x: root.x + 12, y: root.y + 12 }, 200, -40);
    const movedTail = await boxOf(nodeById(page, 'long-10'));
    expect(movedTail.x - tail.x).toBeCloseTo(200, 0);
    await page.mouse.up();
    expect(fps).toBeGreaterThanOrEqual(50);
  });
});
