import { test, expect, gotoAndSettle } from './fixtures';
import config from '../src/assets/config.json';

const contacts = config.about.contact;
const email = contacts.find((contact) => contact.name === 'Email')!;
const socials = contacts.filter((contact) => contact.name !== 'Email');
const { footer } = config;

test.describe('footer', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    // .footer-left-bar / .footer-right-bar are d-none below Bootstrap's md
    // breakpoint — the mobile footer is covered in responsive.spec.ts.
    test.skip(isMobile, 'desktop footer only');
    await gotoAndSettle(page, '/');
  });

  test(`renders one side-bar link per contact in config (${contacts.length})`, async ({ page }) => {
    const links = page.locator('.footer-left-bar li a');
    await expect(links).toHaveCount(contacts.length);

    for (const contact of contacts) {
      await expect(page.locator(`.footer-left-bar a[href="${contact.url}"]`)).toHaveCount(1);
    }
  });

  test('every social link opens in a new tab', async ({ page }) => {
    for (const social of socials) {
      await expect(page.locator(`.footer-left-bar a[href="${social.url}"]`))
        .toHaveAttribute('target', '_blank');
    }
  });

  test('the email link is a mailto: matching config', async ({ page }) => {
    // `handle` is optional across the contact list (Github has none), so
    // assert it exists for Email before asserting the link renders it.
    expect(email.handle).toBeTruthy();

    const link = page.locator('.footer-right-bar a');
    await expect(link).toHaveAttribute('href', email.url);
    await expect(link).toHaveText(String(email.handle));
    expect(email.url).toMatch(/^mailto:/);
  });

  test('the repo, built-with and design-credit links are rel-hardened', async ({ page }) => {
    const creditUrls = [
      footer.repo.url,
      footer.builtWith.url,
      ...footer.designCredits.map((credit) => credit.url),
    ];

    for (const url of creditUrls) {
      const link = page.locator(`.footer-credits a[href="${url}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    }
  });

  test('the credits line shows the repo text and the current year', async ({ page }) => {
    const credits = page.locator('.footer-credits');
    await expect(credits).toContainText(footer.repo.text);
    await expect(credits).toContainText(String(new Date().getFullYear()));
    await expect(credits).toContainText(footer.builtWith.text);
  });

  test('every design credit is named', async ({ page }) => {
    for (const credit of footer.designCredits) {
      await expect(page.locator('.footer-credits')).toContainText(credit.name);
    }
  });
});

// Excluded from PR and push runs via --grep-invert; the Monday schedule in
// .github/workflows/build-test.yml runs them. A third-party site being down
// or rate-limiting a CI egress IP is not a regression in this repo, so it
// must never be able to redden a pull request.
test.describe('@external outbound links', () => {
  const outbound = [
    ...socials.map((social) => social.url),
    footer.repo.url,
    footer.builtWith.url,
    ...footer.designCredits.map((credit) => credit.url),
  ];

  for (const url of outbound) {
    test(`${url} is reachable`, async ({ request }) => {
      // Some hosts (LinkedIn, Instagram) reject HEAD or bot-ish clients
      // outright; only a hard 404/410 means the link itself is dead.
      const response = await request.get(url, { failOnStatusCode: false, timeout: 20_000 });
      expect([404, 410]).not.toContain(response.status());
    });
  }
});
