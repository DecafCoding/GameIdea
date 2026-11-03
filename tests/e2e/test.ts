/**
 * The Playwright test and expect every spec and helper uses. An automatic fixture serves
 * the made-up pools in tests/e2e/fixtures/pools/ for every pools/*.json request. The real
 * pools ship in public/pools/, but the specs need fixed cue texts; the real-pool smoke test
 * removes the route with context.unroute. The route is on the browser context,
 * so a second tab gets it too. A spec that tests the pool failure banner registers its own
 * page.route, which wins over a context route.
 * The settings option seeds the gameidea.settings record before the app starts, per
 * describe block with test.use({ settings: { snap: false } }). The init script writes the
 * key only when it is absent, so a reload or a change made in the test is kept.
 */
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { DEFAULT_SETTINGS, type Settings } from '@/shared/model';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pools');

export const test = playwright.test.extend<{
  fixturePools: void;
  settings: Partial<Omit<Settings, 'version'>> | null;
  seedSettings: void;
}>({
  settings: [null, { option: true }],
  seedSettings: [
    async ({ context, settings }, use) => {
      if (settings) {
        const record = JSON.stringify({ ...DEFAULT_SETTINGS, ...settings });
        await context.addInitScript((value) => {
          if (localStorage.getItem('gameidea.settings') === null) {
            localStorage.setItem('gameidea.settings', value);
          }
        }, record);
      }
      await use();
    },
    { auto: true },
  ],
  fixturePools: [
    async ({ context }, use) => {
      await context.route('**/pools/*.json', (route) =>
        route.fulfill({
          path: join(FIXTURE_DIR, basename(new URL(route.request().url()).pathname)),
        }),
      );
      await use();
    },
    { auto: true },
  ],
});

export const expect = playwright.expect;
