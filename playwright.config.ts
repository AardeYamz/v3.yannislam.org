import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const PORT = 4200;

// PR runs are Chromium + mobile only to keep wall clock down (see
// docs/todo/playwright-e2e-testing-plan.md §5 "Cost control"); push-to-main and
// scheduled runs opt into the full browser matrix.
const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['blob']]
    : [['html', { open: 'on-failure' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The site is animation-heavy (anime.js intro, a RAF loop for floating
    // logos, owl-carousel autoplay, AOS transitions). Reduced motion is the
    // single biggest lever against flake.
    reducedMotion: 'reduce',
  },
  projects: fullMatrix
    ? [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ]
    : [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],
  webServer: {
    // The `?` at the end of --proxy makes http-server fall back to
    // index.html for unknown paths, which the Angular router needs for a
    // hard navigation straight to a route like /projects/highschool.
    command: isCI
      ? `npx http-server dist/v3.yannislam.org/browser -p ${PORT} -s --proxy http://localhost:${PORT}?`
      : `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
