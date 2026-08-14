import { test, expect, gotoAndSettle } from './fixtures';
import config from '../src/assets/config.json';

// Routing between /projects and /projects/highschool (and the fact that
// /projects doesn't render the high-school list) is already covered by
// navigation.spec.ts. This file covers what actually renders on each page.
const pages = [
  { path: '/projects', label: 'college', section: config.projects.college },
  { path: '/projects/highschool', label: 'high school', section: config.projects.highschool },
];

test.describe('projects', () => {
  for (const { path, label, section } of pages) {
    test.describe(`${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await gotoAndSettle(page, path);
      });

      test(`renders the ${label} subsection heading and number`, async ({ page }) => {
        const heading = page.locator(`#${section.sectionId} h3.section-title`).first();
        await expect(heading).toContainText(section.navNumber);
        await expect(heading).toContainText(section.headingText);
      });

      test(`renders all ${section.list.length} ${label} entries`, async ({ page }) => {
        const titles = page.locator(`#${section.sectionId} h5.workhistory-title`);
        await expect(titles).toHaveCount(section.list.length);

        for (const project of section.list) {
          await expect(titles.filter({ hasText: project.title })).toHaveCount(1);
        }
      });

      test(`every ${label} entry shows a timeframe and at least one description paragraph`, async ({ page }) => {
        for (const [index, project] of section.list.entries()) {
          const entry = page.locator(`#${section.sectionId} .workhistory-box`).nth(index);
          await expect(entry).toContainText(project.timeframe);
          expect(await entry.locator('.workhistory-description-box p.mb-1').count())
            .toBeGreaterThanOrEqual(1);
        }
      });

      const linked = section.list.filter((project): project is typeof project & { link: string } => 'link' in project);

      for (const project of linked) {
        test(`"${project.title}" links out to its source`, async ({ page }) => {
          const link = page.locator(`#${section.sectionId} a[href="${project.link}"]`);
          await expect(link).toHaveCount(1);
          await expect(link).toHaveAttribute('target', '_blank');
          // Belt-and-braces against reverse tabnabbing / opener access. Modern
          // browsers imply noopener for target=_blank, but the footer's
          // external links already set it explicitly and these should match.
          await expect(link).toHaveAttribute('rel', /noopener/);
        });
      }
    });
  }
});
