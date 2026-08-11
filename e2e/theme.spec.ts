import { test, expect, gotoAndSettle, headerNav } from './fixtures';

const STORAGE_KEY = 'yl-theme-mode';

const CYCLE = [
  { mode: 'light', variant: 'black', navy: '#f4f1ea' },
  { mode: 'dark', variant: 'white', navy: '#05070c' },
  { mode: 'default', variant: 'clearcolor', navy: '#131f31' },
];

test.describe('theme toggle', () => {
  // Playwright's browser contexts default prefers-color-scheme to "light",
  // which would resolve ThemeService to 'light' rather than 'default' on
  // every test in this file. ThemeService only branches on the "light"
  // media query, so emulating "dark" here is enough to make it resolve to
  // 'default' — Chromium no longer honors the (deprecated) "no-preference"
  // value. The OS-preference test below overrides this via emulateMedia.
  test.use({ colorScheme: 'dark' });

  test('defaults to "default" mode with no stored preference', async ({ page }) => {
    await gotoAndSettle(page, '/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#131f31');
    await expect(page.locator('a.navbar-brand img')).toHaveAttribute('src', /clearcolor\.svg$/);
  });

  test('cycles default -> light -> dark -> default, recoloring the live DOM at each step', async ({ page }) => {
    await gotoAndSettle(page, '/');
    const toggle = page.locator('.theme-toggle');

    let lastBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    for (const step of CYCLE) {
      await toggle.click();

      if (step.mode === 'default') {
        await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
      } else {
        await expect(page.locator('html')).toHaveAttribute('data-theme', step.mode);
      }
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', step.navy);
      await expect(page.locator('a.navbar-brand img')).toHaveAttribute('src', new RegExp(`${step.variant}\\.svg$`));

      const capturedLastBg = lastBg;
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(capturedLastBg);
      lastBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    }
  });

  test('chosen mode persists across reload via localStorage', async ({ page }) => {
    await gotoAndSettle(page, '/');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(headerNav(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('light');
  });

  test('resolves to light when the OS prefers light and nothing is stored', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await gotoAndSettle(page, '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
