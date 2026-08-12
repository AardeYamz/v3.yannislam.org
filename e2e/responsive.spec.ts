import { test, expect, gotoAndSettle, headerNav } from './fixtures';
import config from '../src/assets/config.json';

// AardeYamz is marked `hidden` in config.json and filtered out of the rendered
// nav by SiteConfigService, so the drawer only ever shows the visible entries —
// same filter navigation.spec.ts applies for the desktop nav.
const visibleMenuItems = config.siteMenu.filter((item) => !item.hidden);
const firstScrollItem = visibleMenuItems.find((item) => item.scrollSection)!;
const firstRouteItem = visibleMenuItems.find(
  (item) => !item.scrollSection && item.siteLocation.startsWith('/') && !item.siteLocation.startsWith('/#'),
)!;

test.describe('mobile layout', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    // The desktop nav collapses into the hamburger drawer below 1050px
    // (header.component.scss); the Pixel 7 project is the one that exercises it.
    test.skip(!isMobile, 'mobile viewport only');
    await gotoAndSettle(page, '/');
  });

  test('the hamburger replaces the desktop nav links', async ({ page }) => {
    await expect(page.locator('.menu-toggle')).toBeVisible();
    await expect(page.locator('.nav-right ul.menu-ul')).toBeHidden();
  });

  test('the drawer starts closed and reports it via aria-expanded', async ({ page }) => {
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/aside-show/);
  });

  test('tapping the hamburger opens the drawer', async ({ page }) => {
    await page.locator('.menu-toggle').click();

    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu')).toHaveClass(/aside-show/);
    await expect(page.locator('#mobile-menu a').first()).toBeVisible();
  });

  test('the hamburger controls the drawer it labels', async ({ page }) => {
    // Regression cover for docs/changes/…-fix-hamburger-menu-accessibility.md.
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-controls', 'mobile-menu');
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-label', 'Open menu');
  });

  test('the drawer lists every visible nav entry from config', async ({ page }) => {
    await page.locator('.menu-toggle').click();

    const links = page.locator('#mobile-menu a');
    await expect(links).toHaveCount(visibleMenuItems.length);

    for (const item of visibleMenuItems) {
      await expect(links.filter({ hasText: item.navTitle })).toHaveCount(1);
    }
  });

  test('the drawer hides the AardeYamz easter egg, like the desktop nav', async ({ page }) => {
    await page.locator('.menu-toggle').click();

    await expect(page.locator('#mobile-menu a').filter({ hasText: 'AardeYamz' })).toHaveCount(0);
  });

  test('choosing a section scrolls to it and closes the drawer', async ({ page }) => {
    await page.locator('.menu-toggle').click();
    await page.locator('#mobile-menu a').filter({ hasText: firstScrollItem.navTitle }).click();

    await expect(page.locator(`#${firstScrollItem.scrollSection}`)).toBeInViewport();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/aside-show/);
  });

  test('choosing a routed entry navigates and closes the drawer', async ({ page }) => {
    await page.locator('.menu-toggle').click();
    await page.locator('#mobile-menu a').filter({ hasText: firstRouteItem.navTitle }).click();

    await expect(page).toHaveURL(firstRouteItem.siteLocation);
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/aside-show/);
  });

  test('the mobile contact block replaces the desktop side bars', async ({ page }) => {
    await expect(page.locator('.footer-mobile-contact')).toBeVisible();
    await expect(page.locator('.footer-left-bar')).toBeHidden();
    await expect(page.locator('.footer-right-bar')).toBeHidden();
  });

  test('the mobile footer lists every social except email, plus the email link', async ({ page }) => {
    const socials = config.about.contact.filter((contact) => contact.name !== 'Email');
    const email = config.about.contact.find((contact) => contact.name === 'Email')!;

    await expect(page.locator('.footer-mobile-socials li a')).toHaveCount(socials.length);
    await expect(page.locator('a.footer-mobile-email')).toHaveAttribute('href', email.url);
  });

  test('nothing overflows the viewport horizontally', async ({ page }) => {
    await expect(headerNav(page)).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    // 1px of slack for sub-pixel layout rounding.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
