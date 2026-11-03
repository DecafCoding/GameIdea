/**
 * Browser tests for the card test page, against the built app on port 4173:
 * draw, ring halves, hover, keys, combine, the pools banner, timing and locked tokens.
 */
import { expect, test } from '@playwright/test';
import { ARROW, activeCue, backgroundRgb, draw, edge, expectRgbNear } from './helpers';

const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. Drawing is off until the decks load.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('with pools loaded', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/card-test');
    await expect(page.getByRole('button', { name: 'Draw A Character' })).toBeEnabled();
  });

  test('draw_eachDeck_showsCardWithRightCueCount', async ({ page }) => {
    const expected = [
      ['Character', 4],
      ['Motivation', 2],
      ['Setting', 4],
      ['Conflict', 2],
      ['Description', 4],
    ] as const;
    for (const [deck, count] of expected) {
      const card = await draw(page, deck);
      await expect(card).toHaveAttribute('data-type', deck.toLowerCase());
      await expect(card.locator('[data-edge]')).toHaveCount(count);
      if (deck === 'Setting') {
        for (const label of await card.locator('[data-edge]').all()) {
          await expect(label).toHaveAttribute('data-kind', /^(place|object|event)$/);
        }
      }
    }
  });

  test('ringHalf_rightClickOnCharacter_movesRightCueToBottom', async ({ page }) => {
    const card = await draw(page, 'Character');
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
    const card = await draw(page, 'Character');
    await page.mouse.move(0, 0);
    const layer = card.getByTestId('ring-layer');
    await expect(layer).toHaveCSS('opacity', '0');
    await card.hover();
    await expect(layer).toHaveCSS('opacity', '1');
  });

  test('keys_rAndShiftR_turnOuterAndInnerRings', async ({ page }) => {
    // Expected texts come from the edge cues, since nouns and adjectives may be 2 words.
    const character = await draw(page, 'Character');
    const noun0 = (await edge(character, 0).textContent())!;
    const noun3 = (await edge(character, 3).textContent())!;
    const description = await draw(page, 'Description');
    const adj0 = (await edge(description, 0).textContent())!;
    const adj3 = (await edge(description, 3).textContent())!;
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

  for (const deck of ['Character', 'Setting'] as const) {
    test(`combine_${deck.toLowerCase()}AndDescription_activeCueIsAdjectiveNounPair`, async ({
      page,
    }) => {
      const target = await draw(page, deck);
      const noun = await activeCue(target).textContent();
      const description = await draw(page, 'Description');
      const adjective = await activeCue(description).textContent();
      const descriptions = page.locator('[data-testid="card"][data-type="description"]');
      await expect(descriptions).toHaveCount(1);

      await page.getByRole('button', { name: 'Combine' }).click();
      await expect(descriptions).toHaveCount(0);
      const combined = page.locator(`[data-testid="card"][data-type="${deck.toLowerCase()}"]`);
      await expect(combined.getByTestId('combined-disc')).toBeVisible();
      await expect(activeCue(combined)).toHaveText(`${adjective} ${noun}`);
    });
  }

  test('timing_drawAndTurn_under100ms', { tag: '@timing' }, async ({ page }) => {
    // Warm the browser engine with one draw, then measure on a fresh page. The first card
    // painted in a new WebKit process costs 90+ ms of one-time engine start-up on CI,
    // whatever the card's CSS; that is not the app's draw time.
    await draw(page, 'Character');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Draw A Character' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const drawResult = await page.evaluate(async () => {
      const button = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === 'Draw A Character',
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
    const card = await draw(page, 'Character');
    await page.evaluate(() => document.fonts.ready);
    const box = await card.boundingBox();
    expect(box?.width).toBe(250);
    expect(box?.height).toBe(250);
    await expect(card).toHaveCSS('border-radius', '14px');
    // 14 percent of --type-character mixed into --paper.
    expectRgbNear(await backgroundRgb(card), [218, 222, 227]);

    const disc = card.getByTestId('type-disc');
    const discBox = await disc.boundingBox();
    expect(discBox?.width).toBe(48);
    expect(discBox?.height).toBe(48);
    await expect(disc).toHaveCSS('background-color', 'rgb(59, 111, 209)');

    const cue = activeCue(card);
    await expect(cue).toHaveCSS('font-size', '15px');
    await expect(cue).toHaveCSS('font-weight', '700');
    await expect(cue).toHaveCSS('font-family', /^"?Space Grotesk/);
    expect(await page.evaluate(() => document.fonts.check('700 15px "Space Grotesk"'))).toBe(true);
  });
});

test('poolsBanner_poolsBlocked_showsBannerThenRetryRecovers', async ({ page }) => {
  await page.route('**/pools/*.json', (route) => route.abort());
  await page.goto('/#/card-test');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText(POOLS_FAILED_TEXT);
  for (const button of await page.getByRole('button', { name: /^Draw A / }).all()) {
    await expect(button).toBeDisabled();
  }

  await page.unroute('**/pools/*.json');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toHaveCount(0);
  const card = await draw(page, 'Conflict');
  await expect(card.locator('[data-edge]')).toHaveCount(2);
});
