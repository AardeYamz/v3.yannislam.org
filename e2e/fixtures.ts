import { test as base, expect, type Page } from '@playwright/test';

// index.html loads gtag.js from googletagmanager.com, and AppComponent
// injects Vercel Analytics + Speed Insights (which, when self-hosted off
// Vercel's edge, fetch their script from a same-origin /_vercel/* path).
// All of it is slow/flaky in CI and irrelevant to app correctness, so block
// it for every test rather than per-spec.
const BLOCKED_HOST_PATTERN = /(googletagmanager\.com|google-analytics\.com|vercel-scripts\.com|vercel-insights\.com)$/;
const BLOCKED_PATH_PATTERN = /^\/_vercel\//;

// Console noise from a genuinely unreachable *third-party* resource (a
// hotlinked org logo CDN, an intentionally-blocked analytics script) is not
// an app bug — LogoFallbackDirective exists specifically to tolerate the
// former, and the latter is blocked on purpose below. Only page-level
// uncaught exceptions and same-origin resource failures indicate a real
// regression, so that's what consoleErrors/failedRequests should reflect.
const THIRD_PARTY_RESOURCE_ERROR = /^Failed to load resource/;

type Fixtures = {
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (BLOCKED_HOST_PATTERN.test(url.hostname) || BLOCKED_PATH_PATTERN.test(url.pathname)) {
        // fulfill() rather than abort(): an aborted request still logs its
        // own "Failed to load resource" console error, which would trip up
        // assertions that this blocking exists specifically to keep clean.
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      }
      return route.continue();
    });

    // The production build registers ngsw-config.json's service worker.
    // Unregister it so one test's cached response can't leak into another
    // test sharing the same origin.
    await page.addInitScript(() => {
      navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    });

    await use(page);
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !THIRD_PARTY_RESOURCE_ERROR.test(msg.text())) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await use(errors);
  },
});

export { expect };

// The <app-header> custom element itself always has a zero-height bounding
// box (its <nav> child is position:fixed and removed from flow), so
// Playwright's toBeVisible() would never resolve against it — assert on the
// nav it wraps instead.
export const headerNav = (page: Page) => page.locator('app-header nav.main-navbar');

// Navigate to `path` and wait past the boot sequence. The header nav isn't
// in the DOM until LoadingScreenComponent's hard-coded MIN_DISPLAY_MS
// elapses and it emits `finished` — never `waitForTimeout(1400)` instead.
export async function gotoAndSettle(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(headerNav(page)).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await page.evaluate(() => document.fonts.ready);
}
