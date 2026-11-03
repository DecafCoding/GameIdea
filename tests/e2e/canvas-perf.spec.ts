/**
 * The canvas speed target (nfr-targets in docs/architecture.html): at least 50 frames per
 * second while panning and dragging on the 200-card fixture board. Chromium only, in the
 * timing project, so it runs alone. Frames are counted with requestAnimationFrame while
 * paced mouse moves run.
 */
import { expect, test, type Page } from '@playwright/test';
import { board200 } from '@/test/fixtures/boards';
import { boxOf, cardById, openBoard } from './board-helpers';

const STEPS = 60;
const PACE_MS = 33;

async function startFrameCounter(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: { count: number; start: number; run: boolean } };
    w.__frames = { count: 0, start: performance.now(), run: true };
    const tick = () => {
      if (!w.__frames.run) return;
      w.__frames.count++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopFrameCounter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: { count: number; start: number; run: boolean } };
    w.__frames.run = false;
    return w.__frames.count / ((performance.now() - w.__frames.start) / 1000);
  });
}

/** Presses at from and moves by dx, dy in paced steps (about 2 seconds). The mouse stays down. */
async function pacedDrag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await startFrameCounter(page);
  for (let i = 1; i <= STEPS; i++) {
    await page.mouse.move(from.x + (dx * i) / STEPS, from.y + (dy * i) / STEPS);
    await page.waitForTimeout(PACE_MS);
  }
  const fps = await stopFrameCounter(page);
  test.info().annotations.push({ type: 'fps', description: fps.toFixed(1) });
  return fps;
}

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
    const root = await boxOf(cardById(page, 'character-stack-1'));
    const fps = await pacedDrag(page, { x: root.x + 10, y: root.y + 10 }, 200, -150);
    // The stack moves with its top card during the drag.
    expect((await boxOf(cardById(page, 'conflict-stack-1'))).x - root.x).toBeCloseTo(200, 0);
    await page.mouse.up();
    expect(fps).toBeGreaterThanOrEqual(50);
  });
});
