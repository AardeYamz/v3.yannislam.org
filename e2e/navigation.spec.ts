import { test, expect, gotoAndSettle } from './fixtures';
import config from '../src/assets/config.json';

const visibleMenuItems = config.siteMenu.filter((item) => !item.hidden);
const scrollableMenuItems = visibleMenuItems.filter((item) => item.scrollSection);
const routeMenuItems = visibleMenuItems.filter((item) => !item.scrollSection && item.siteLocation.startsWith('/') && !item.siteLocation.startsWith('/#'));

test.describe('navigation', () => {
  // The desktop nav links are hidden below 1050px in favor of the hamburger
  // drawer (see responsive.spec.ts territory in the plan) — this file only
  // covers the desktop nav.
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav only');
    await gotoAndSettle(page, '/');
  });

  for (const item of scrollableMenuItems) {
    test(`clicking "${item.navTitle}" scrolls #${item.scrollSection} into view`, async ({ page }) => {
      await page.locator('.nav-right ul.menu-ul').getByText(item.navTitle, { exact: true }).click();
      await expect(page.locator(`#${item.scrollSection}`)).toBeInViewport();
    });
  }

  for (const item of routeMenuItems) {
    test(`clicking "${item.navTitle}" navigates to ${item.siteLocation}`, async ({ page }) => {
      await page.locator('.nav-right ul.menu-ul').getByText(item.navTitle, { exact: true }).click();
      await expect(page).toHaveURL(item.siteLocation);
    });
  }

  test('header logo returns to the home page', async ({ page }) => {
    await gotoAndSettle(page, '/aardeyamz');
    await page.locator('a.navbar-brand').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('#banner')).toBeVisible();
  });

  test('direct hard navigation renders /projects', async ({ page }) => {
    await gotoAndSettle(page, '/projects');
    await expect(page.locator(`#${config.projects.sectionId}`)).toContainText(config.projects.headingText);
    await expect(page.locator(`#${config.projects.college.sectionId}`)).toBeVisible();
  });

  test('direct hard navigation renders /projects/highschool', async ({ page }) => {
    await gotoAndSettle(page, '/projects/highschool');
    await expect(page.locator(`#${config.projects.highschool.sectionId}`)).toContainText(config.projects.highschool.headingText);
  });

  test('/projects does not render the high-school project list', async ({ page }) => {
    await gotoAndSettle(page, '/projects');
    await expect(page.locator(`#${config.projects.highschool.sectionId}`)).toHaveCount(0);
  });

  test('"View High School Projects" link navigates forward, "Back to Projects" returns', async ({ page }) => {
    await gotoAndSettle(page, '/projects');
    await page.getByRole('link', { name: `View ${config.projects.highschool.headingText}` }).click();
    await expect(page).toHaveURL('/projects/highschool');

    await page.getByRole('link', { name: '← Back to Projects' }).click();
    await expect(page).toHaveURL('/projects');
  });

  test('direct hard navigation renders /aardeyamz', async ({ page }) => {
    await gotoAndSettle(page, '/aardeyamz');
    await expect(page.locator('.section.namecard')).toBeVisible();
  });

  test('AardeYamz is an easter egg: reachable directly but absent from the visible nav', async ({ page }) => {
    await expect(page.locator('.nav-right ul.menu-ul').getByText('AardeYamz', { exact: true })).toHaveCount(0);
  });

  test('unknown routes redirect to home', async ({ page }) => {
    await gotoAndSettle(page, '/does-not-exist');
    await expect(page).toHaveURL('/');
    await expect(page.locator('#banner')).toBeVisible();
  });

  test('browser back/forward move between routes', async ({ page }) => {
    await gotoAndSettle(page, '/');

    await gotoAndSettle(page, '/aardeyamz');
    await expect(page).toHaveURL('/aardeyamz');

    await page.goBack();
    await expect(page).toHaveURL('/');

    await page.goForward();
    await expect(page).toHaveURL('/aardeyamz');
  });
});
