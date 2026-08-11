import { test, expect, gotoAndSettle } from './fixtures';

// ResumeService resolves the filename from resume-manifest.json, which
// scripts/generate-resume-manifest.js regenerates from whichever dated PDF
// in src/assets/resume/ is newest. The failure mode worth guarding is a
// manifest that points at a file which isn't in the build — the unit spec
// only asserts the URL string it builds, never that the URL resolves.
const RESUME_URL_PATTERN = /\/assets\/resume\/.+\.pdf$/;

declare global {
  interface Window {
    __openedUrls?: string[];
  }
}

// Reading the URL off the popup Page is racy: context.waitForEvent('page')
// resolves the moment the tab is created, before it has committed a
// navigation, so popup.url() is still "" — and a PDF target may never
// commit one at all, since headless Chromium downloads PDFs rather than
// rendering them. Recording the window.open() argument instead tests the
// same contract (which URL the click opens) deterministically.
async function recordOpenedUrls(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    window.__openedUrls = [];
    window.open = (url?: string | URL) => {
      window.__openedUrls?.push(String(url));
      return null;
    };
  });
}

const clickResume = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'resume' }).click();

const openedUrl = async (page: import('@playwright/test').Page): Promise<string> => {
  await expect.poll(() => page.evaluate(() => window.__openedUrls?.length ?? 0)).toBeGreaterThan(0);
  const urls = await page.evaluate(() => window.__openedUrls ?? []);
  return decodeURIComponent(urls[0]);
};

test.describe('resume', () => {
  test('the banner resume button opens a new tab', async ({ page, context }) => {
    // Left un-stubbed on purpose: this is the one test that exercises the
    // real window.open, proving the call still happens inside the click
    // handler's stack rather than being treated as a blocked popup.
    await gotoAndSettle(page, '/');

    const [popup] = await Promise.all([context.waitForEvent('page'), clickResume(page)]);

    expect(popup).toBeTruthy();
    await popup.close();
  });

  test('the tab it opens points at the manifest-resolved resume PDF', async ({ page }) => {
    await recordOpenedUrls(page);
    await gotoAndSettle(page, '/');
    await clickResume(page);

    expect(await openedUrl(page)).toMatch(RESUME_URL_PATTERN);
  });

  test('the resolved filename carries the YYYYMMDD date the manifest sorts on', async ({ page }) => {
    await recordOpenedUrls(page);
    await gotoAndSettle(page, '/');
    await clickResume(page);

    const filename = (await openedUrl(page)).split('/').pop() ?? '';

    // Same pattern generate-resume-manifest.js matches on. A filename that
    // drifts from it means the manifest silently fell back / picked nothing.
    expect(filename).toMatch(/^.+ \d{8}\.pdf$/);
  });

  test('the resume URL actually serves a PDF', async ({ page, request }) => {
    await recordOpenedUrls(page);
    await gotoAndSettle(page, '/');
    await clickResume(page);

    const response = await request.get(await openedUrl(page));

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });
});
