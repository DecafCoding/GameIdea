/**
 * The first-load target (nfr-targets in docs/architecture.html): under 2 s at 25 Mbps.
 * Chromium only, in the timing project: CDP throttles the network to 25 Mbps down, 5 Mbps
 * up and 40 ms latency with the cache off, then times the board list until the "Boards"
 * heading shows and a board until its deck buttons are on (the real pools loaded). Lighthouse,
 * the architecture's named tool, is not a dependency; this measures the same target.
 */
import { expect, test } from './test';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';

test.describe('first load', { tag: '@timing' }, () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP throttling is Chromium only.');

  test('firstLoad_25Mbps_under2s', async ({ page, context }) => {
    // The real pools, so they load through the throttled network too.
    await context.unroute('**/pools/*.json');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: 25e6 / 8,
      uploadThroughput: 5e6 / 8,
    });
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    let start = Date.now();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Boards' })).toBeVisible();
    const listMs = Date.now() - start;

    const board = { ...fixtureBoard([fixtureCard('role', { x: 96, y: 96 })]), id: 'first-load' };
    await page.addInitScript((b) => {
      window.__GAMEIDEA_E2E_BOARD__ = b;
    }, board);
    // A hash change alone would not reload the page (so the init script would not run), and
    // a reload after it would time two loads. Leave the app first, then load the board once.
    await page.goto('about:blank');
    start = Date.now();
    await page.goto(`/#/board/${board.id}`);
    await expect(
      page.getByRole('button', { name: 'Draw A Player Role', exact: true }).first(),
    ).toBeEnabled();
    const boardMs = Date.now() - start;

    const measured = `board list ${listMs} ms, board with pools ${boardMs} ms`;
    test.info().annotations.push({ type: 'first-load', description: measured });
    process.stdout.write(`firstLoad_25Mbps: ${measured}\n`);
    expect(listMs).toBeLessThan(2000);
    expect(boardMs).toBeLessThan(2000);
  });
});
