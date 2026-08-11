import { test, expect, gotoAndSettle, headerNav } from './fixtures';

const ROUTES = ['/', '/projects', '/projects/highschool', '/aardeyamz'];

test.describe('smoke', () => {
  test('home page boots: loading overlay plays out, header mounts, scroll is restored', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    const overlay = page.locator('.loading-screen');
    await expect(overlay).toBeVisible();

    await expect(headerNav(page)).toBeVisible({ timeout: 15_000 });
    await expect(overlay).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    await expect(page.locator('app-root')).not.toBeEmpty();
  });

  test('page title matches the SEO title authored in index.html', async ({ page }) => {
    await gotoAndSettle(page, '/');
    // AppComponent.ngOnInit used to overwrite this with a shorter, weaker
    // title at runtime; that was removed once prerendering made it clobber
    // the real SEO tags on every static page (see the "Fix SEO tags being
    // clobbered..." commit), so index.html's title is now authoritative.
    await expect(page).toHaveTitle('Yannis Lam | Software Developer');
  });

  for (const route of ROUTES) {
    test(`no console errors or failed same-origin requests on ${route}`, async ({ page, consoleErrors, baseURL }) => {
      // Scoped to same-origin: config.json intentionally hotlinks third-party
      // org logo CDNs (see LogoFallbackDirective), which this suite doesn't
      // control and shouldn't fail on — a stale/missing path in our own
      // build output is what this guards against.
      const failedRequests: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 400 && new URL(response.url()).origin === baseURL) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });

      await gotoAndSettle(page, route);
      await page.waitForLoadState('networkidle');

      expect(consoleErrors, `console errors on ${route}`).toEqual([]);
      expect(failedRequests, `failed same-origin requests on ${route}`).toEqual([]);
    });
  }
});
