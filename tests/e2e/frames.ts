/**
 * Frame counting for the canvas speed checks (nfr-targets in docs/architecture.html):
 * a requestAnimationFrame counter and a paced drag of 60 mouse moves at 33 ms.
 */
import type { Page } from '@playwright/test';
import { test } from './test';

const STEPS = 60;
const PACE_MS = 33;

export async function startFrameCounter(page: Page): Promise<void> {
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

export async function stopFrameCounter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: { count: number; start: number; run: boolean } };
    w.__frames.run = false;
    return w.__frames.count / ((performance.now() - w.__frames.start) / 1000);
  });
}

/** Presses at from and moves by dx, dy in paced steps (about 2 seconds). The mouse stays down. */
export async function pacedDrag(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  dy: number,
): Promise<number> {
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
