/**
 * Browser tests for the card test page, against the built app on port 4174:
 * draw, ring halves, hover, keys, combine, the pools banner, timing and locked tokens.
 */
import type { Route } from '@playwright/test';
import { expect, test } from './test';
import { ARROW, activeCue, backgroundRgb, draw, edge, expectRgbNear } from './helpers';

const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. Drawing is off until the decks load.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('with pools loaded', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/card-test');
    await expect(page.getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
  });

  test('draw_eachDeck_showsCardWithRightCueCount', async ({ page }) => {
    const expected = [
      ['Player Role', 'role', 4],
      ['Goal', 'goal', 2],
      ['Conflict', 'conflict', 2],
      ['Modifier', 'modifier', 4],
      ['Setting', 'setting', 4],
    ] as const;
    for (const [deck, type, count] of expected) {
      const card = await draw(page, deck);
      await expect(card).toHaveAttribute('data-type', type);
      await expect(card.locator('[data-edge]')).toHaveCount(count);
    }
  });

  test('ringHalf_rightClickOnRole_movesRightCueToBottom', async ({ page }) => {
    const card = await draw(page, 'Player Role');
    const right = await edge(card, 3).textContent();
    await card.hover();
    await card
      .getByRole('button', { name: 'Turn Nouns Right' })
      .click({ position: ARROW.innerRight });
    await expect(activeCue(card)).toHaveText(right ?? '');

    const left = await edge(card, 1).textContent();
    await card
      .getByRole('button', { name: 'Turn Nouns Left' })
      .click({ position: ARROW.innerLeft });
    await expect(activeCue(card)).toHaveText(left ?? '');
  });

  test('ringHalf_hoverCard_ringsBecomeVisible', async ({ page }) => {
    const card = await draw(page, 'Player Role');
    await page.mouse.move(0, 0);
    const layer = card.getByTestId('ring-layer');
    await expect(layer).toHaveCSS('opacity', '0');
    await card.hover();
    await expect(layer).toHaveCSS('opacity', '1');
  });

  test('keys_rAndShiftR_turnOuterAndInnerRings', async ({ page }) => {
    // Expected texts come from the edge cues, since nouns and adjectives may be 2 words.
    const role = await draw(page, 'Player Role');
    const noun0 = (await edge(role, 0).textContent())!;
    const noun3 = (await edge(role, 3).textContent())!;
    const modifier = await draw(page, 'Modifier');
    const adj0 = (await edge(modifier, 0).textContent())!;
    const adj3 = (await edge(modifier, 3).textContent())!;
    await page.getByRole('button', { name: 'Combine' }).click();
    const card = page.getByTestId('card').first();
    await expect(card).toHaveAttribute('data-combined', 'true');
    await expect(activeCue(card)).toHaveText(`${adj0} ${noun0}`);

    // A clockwise turn brings the right edge (3) to the bottom.
    await card.hover();
    await page.keyboard.press('r');
    await expect(activeCue(card)).toHaveText(`${adj0} ${noun3}`);

    await page.keyboard.press('Shift+R');
    await expect(activeCue(card)).toHaveText(`${adj3} ${noun3}`);
  });

  for (const [deck, type] of [
    ['Player Role', 'role'],
    ['Setting', 'setting'],
  ] as const) {
    test(`combine_${type}AndModifier_activeCueIsAdjectiveNounPair`, async ({ page }) => {
      const target = await draw(page, deck);
      const noun = await activeCue(target).textContent();
      const modifier = await draw(page, 'Modifier');
      const adjective = await activeCue(modifier).textContent();
      const modifiers = page.locator('[data-testid="card"][data-type="modifier"]');
      await expect(modifiers).toHaveCount(1);

      await page.getByRole('button', { name: 'Combine' }).click();
      await expect(modifiers).toHaveCount(0);
      const combined = page.locator(`[data-testid="card"][data-type="${type}"]`);
      await expect(combined.getByTestId('combined-disc')).toBeVisible();
      await expect(activeCue(combined)).toHaveText(`${adjective} ${noun}`);
    });
  }

  test('timing_drawAndTurn_under100ms', { tag: '@timing' }, async ({ page }) => {
    // Warm the browser engine with one draw, then measure on a fresh page. The first card
    // painted in a new WebKit process costs 90+ ms of one-time engine start-up on CI,
    // whatever the card's CSS; that is not the app's draw time.
    await draw(page, 'Player Role');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Draw A Player Role' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const drawResult = await page.evaluate(async () => {
      const button = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === 'Draw A Player Role',
      )!;
      const before = document.querySelectorAll('[data-testid="card"]').length;
      const start = performance.now();
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const elapsed = performance.now() - start;
      return {
        elapsed,
        changed: document.querySelectorAll('[data-testid="card"]').length > before,
      };
    });
    expect(drawResult.changed).toBe(true);
    expect(drawResult.elapsed).toBeLessThan(100);

    const turnResult = await page.evaluate(async () => {
      const card = document.querySelector('[data-testid="card"]')!;
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

  test('tokens_card_rendersAtLockedValues', async ({ page }) => {
    const card = await draw(page, 'Player Role');
    await page.evaluate(() => document.fonts.ready);
    const box = await card.boundingBox();
    expect(box?.width).toBe(200);
    expect(box?.height).toBe(200);
    await expect(card).toHaveCSS('border-radius', '14px');
    // The cream --card-face, the same for every deck (design 9.4).
    expectRgbNear(await backgroundRgb(card), [244, 240, 230]);

    const disc = card.getByTestId('type-disc');
    const discBox = await disc.boundingBox();
    expect(discBox?.width).toBe(48);
    expect(discBox?.height).toBe(48);
    await expect(disc).toHaveCSS('background-color', 'rgb(47, 95, 184)');

    const cue = activeCue(card);
    // Design 9.4: the active cue is Display 14/700.
    await expect(cue).toHaveCSS('font-size', '14px');
    await expect(cue).toHaveCSS('font-weight', '700');
    await expect(cue).toHaveCSS('font-family', /^"?Space Grotesk/);
    expect(await page.evaluate(() => document.fonts.check('700 14px "Space Grotesk"'))).toBe(true);
  });
});

test('poolsBanner_poolsBlocked_showsBannerThenRetryRecovers', async ({ page }) => {
  // Only this handler goes on unroute; the fixture pools route stays.
  const block = (route: Route) => route.abort();
  await page.route('**/pools/*.json', block);
  await page.goto('/#/card-test');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText(POOLS_FAILED_TEXT);
  for (const button of await page.getByRole('button', { name: /^Draw A / }).all()) {
    await expect(button).toBeDisabled();
  }

  await page.unroute('**/pools/*.json', block);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toHaveCount(0);
  const card = await draw(page, 'Conflict');
  await expect(card.locator('[data-edge]')).toHaveCount(2);
});
