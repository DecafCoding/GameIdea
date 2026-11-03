/**
 * The Playwright test and expect every spec and helper uses. An automatic fixture serves
 * the made-up pools in tests/e2e/fixtures/pools/ for every pools/*.json request, because
 * no pool files ship in public/pools/ until Phase 2. The route is on the browser context,
 * so a second tab gets it too. A spec that tests the pool failure banner registers its own
 * page.route, which wins over a context route.
 */
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pools');

export const test = playwright.test.extend<{ fixturePools: void }>({
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
