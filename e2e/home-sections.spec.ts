import { test, expect, gotoAndSettle } from './fixtures';
import config from '../src/assets/config.json';

const experiences = config.about.experiences;

test.describe('home sections', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/');
  });

  test('banner, about, education, work and volunteering sections all render', async ({ page }) => {
    for (const id of ['banner', 'about', 'education', experiences.work.sectionId, experiences.volunteering.sectionId]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('banner shows the configured greeting and name', async ({ page }) => {
    const banner = page.locator('#banner');
    await expect(banner.locator('h1')).toHaveText(config.banner.greeting);
    await expect(banner.locator('.banner-title h2')).toHaveText(config.banner.name);
  });

  test('about section lists every configured skill', async ({ page }) => {
    const skills = page.locator('#about .skills-list .skill-element');
    await expect(skills).toHaveCount(experiences.skills.length);
    for (const skill of experiences.skills) {
      await expect(page.locator('#about .skills-list')).toContainText(skill);
    }
  });

  test('education renders one tab per configured entry and swaps content on click', async ({ page }) => {
    const tabs = page.locator('#education ul.nav-tabs > li');
    await expect(tabs).toHaveCount(experiences.education.length);

    const panel = page.locator('#education .education-tabs > div.mt-2');
    for (let i = 0; i < experiences.education.length; i++) {
      const entry = experiences.education[i];
      await tabs.nth(i).locator('a').click();
      await expect(panel).toContainText(entry.title);
      await expect(panel).toContainText(entry.organization);
      await expect(panel).toContainText(entry.timeframe);
    }
  });

  test('work section renders every configured entry with a title, timeframe, description and image', async ({ page, isMobile }) => {
    const section = page.locator(`#${experiences.work.sectionId}`);
    await expect(section.locator('h3.section-title')).toContainText(experiences.work.headingText);

    const entries = section.locator('.workhistory-container');
    await expect(entries).toHaveCount(experiences.work.list.length);

    for (let i = 0; i < experiences.work.list.length; i++) {
      const exp = experiences.work.list[i];
      const entry = entries.nth(i);
      await expect(entry).toContainText(exp.title);
      if (exp.timeframe) await expect(entry).toContainText(exp.timeframe);
      if (exp.description?.length) await expect(entry).toContainText(exp.description[0]);

      // Below 768px (workhistory.component.scss) the org image becomes a
      // CSS background-image on the info card via LogoFallbackBgDirective
      // instead of a foreground <img> — neither the carousel's copy nor the
      // static thumbnail is visible there, by design.
      if (!isMobile) {
        // Each entry also carries an owl-carousel copy of the same image,
        // which stays hidden until the carousel widget finishes initializing
        // — the static thumbnail is the reliable one to assert on.
        await expect(entry.locator('.img-feature-workhistory-container img.img-feature-workhistory')).toBeVisible();
      }
    }
  });

  test('volunteering section renders every configured entry', async ({ page }) => {
    const section = page.locator(`#${experiences.volunteering.sectionId}`);
    await expect(section.locator('h3.section-title')).toContainText(experiences.volunteering.headingText);

    const entries = section.locator('.workhistory-container');
    await expect(entries).toHaveCount(experiences.volunteering.list.length);
  });
});
