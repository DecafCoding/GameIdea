/**
 * Helpers for the browser tests: ring-half arrow points, drawing cards and paper colors.
 * A ring-half button is 200 × 200 but clipped to its half, so clicks go to the arrow
 * point inside the half, never the box center (which sits over the type disc).
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from './test';

export const ARROW = {
  innerLeft: { x: 66.5, y: 100 },
  innerRight: { x: 133.5, y: 100 },
  outerLeft: { x: 50.5, y: 100 },
  outerRight: { x: 149.5, y: 100 },
} as const;

export type DeckName = 'Player Role' | 'Goal' | 'Conflict' | 'Modifier' | 'Setting';

/** Clicks "Draw A <deck>" and returns the newest card (the page lists newest first). */
export async function draw(page: Page, deck: DeckName): Promise<Locator> {
  await page.getByRole('button', { name: `Draw A ${deck}` }).click();
  return page.getByTestId('card').first();
}

export function activeCue(card: Locator): Locator {
  return card.getByTestId('active-cue');
}

export function edge(card: Locator, index: number): Locator {
  return card.locator(`[data-edge="${index}"]`);
}

/**
 * The element's background as [r, g, b] in 0 to 255. A canvas pixel normalizes the format,
 * because browsers report a color-mix() result as color(srgb …) or rgb(…).
 */
export async function backgroundRgb(locator: Locator): Promise<number[]> {
  return locator.evaluate((el) => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = getComputedStyle(el).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  });
}

/** Checks each channel within 1, for rounding in the color mix. */
export function expectRgbNear(actual: number[], expected: number[]) {
  actual.forEach((value, i) => expect(Math.abs(value - expected[i]!)).toBeLessThanOrEqual(1));
}
