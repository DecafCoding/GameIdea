/**
 * Playwright config: browser tests in Chromium, Firefox and WebKit against the built app
 * served by `npm start` on the locked port 4173.
 * Tests tagged @timing run in their own projects, one browser at a time, after the rest,
 * so the 100 ms checks measure the app and not a CPU shared with other browser workers.
 */
import { defineConfig, devices } from '@playwright/test';

const browsers = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    ...browsers.map((browser) => ({ ...browser, grepInvert: /@timing/ })),
    // Timing projects run one at a time, after every functional project.
    ...browsers.map((browser, i) => ({
      ...browser,
      name: `${browser.name}-timing`,
      grep: /@timing/,
      dependencies: i === 0 ? browsers.map((b) => b.name) : [`${browsers[i - 1]!.name}-timing`],
    })),
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
