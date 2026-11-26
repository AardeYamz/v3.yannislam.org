import { test, expect, gotoAndSettle } from './fixtures';

// ResumeService opens the PDF that yl-resume publishes to GitHub Pages. This only
// checks which URL the click opens: whether that URL serves a PDF is yl-resume's
// deployment, not this build, so it is not fetched here.
const RESUME_URL = 'https://aardeyamz.github.io/yl-resume/resume.pdf';

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

  test('the tab it opens points at the published resume PDF', async ({ page }) => {
    await recordOpenedUrls(page);
    await gotoAndSettle(page, '/');
    await clickResume(page);

    expect(await openedUrl(page)).toBe(RESUME_URL);
  });
});
