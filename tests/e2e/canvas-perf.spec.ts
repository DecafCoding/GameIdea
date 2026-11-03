/**
 * The canvas speed target (nfr-targets in docs/architecture.html): at least 50 frames per
 * second while panning and dragging on the 200-card fixture board. Chromium only, in the
 * timing project, so it runs alone. Frames are counted with requestAnimationFrame while
 * paced mouse moves run.
 */
import { expect, test } from './test';
import { board200 } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard } from './board-helpers';
import { pacedDrag } from './frames';

test.describe('200-card frame rate', { tag: '@timing' }, () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'The trace target is Chromium only.');

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Zoom 50 percent, panned so rows 4 to 7 (about half the board, with the stacks) show.
    await openBoard(page, { ...board200(), view: { panX: 20, panY: -528, zoom: 0.5 } });
    await expect(page.getByRole('button', { name: 'Reset Zoom' })).toHaveText('50%');
  });

  test('perf_pan200Cards_atLeast50Fps', async ({ page }) => {
    // Press on the empty pane in the grid gap between 2 cards of row 4.
    const left = await boxOf(cardById(page, 'card-80'));
    const right = await boxOf(cardById(page, 'card-81'));
    const from = { x: (left.x + left.width + right.x) / 2, y: left.y + left.height / 2 };
    const fps = await pacedDrag(page, from, 300, 150);
    await page.mouse.up();
    expect(fps).toBeGreaterThanOrEqual(50);
    // The view panned with the pointer.
    expect((await boxOf(cardById(page, 'card-80'))).x - left.x).toBeCloseTo(300, 0);
  });

  test('perf_drag200Cards_atLeast50Fps', async ({ page }) => {
    const root = await boxOf(cardById(page, 'role-stack-1'));
    const rootNode = await boxOf(page.locator('.react-flow__node[data-id="role-stack-1"]'));
    const tailNode = page.locator('.react-flow__node[data-id="conflict-stack-1"]');
    const tail = await boxOf(tailNode);
    const fps = await pacedDrag(page, { x: root.x + 10, y: root.y + 10 }, 200, -150);
    // The stack moves with its top card during the drag (snap may put it a few px off 200).
    const moved =
      (await boxOf(page.locator('.react-flow__node[data-id="role-stack-1"]'))).x - rootNode.x;
    expect(Math.abs(moved - 200)).toBeLessThanOrEqual(24);
    expect((await boxOf(tailNode)).x - tail.x).toBeCloseTo(moved, 0);
    await page.mouse.up();
    expect(fps).toBeGreaterThanOrEqual(50);
  });
});
