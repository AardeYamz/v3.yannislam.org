import { test, expect, gotoAndSettle } from './fixtures';

// ResumeService resolves the filename from resume-manifest.json, which
// scripts/generate-resume-manifest.js regenerates from whichever dated PDF
// in src/assets/resume/ is newest. The failure mode worth guarding is a
// manifest that points at a file which isn't in the build — the unit spec
// only asserts the URL string it builds, never that the URL resolves.
const RESUME_URL_PATTERN = /\/assets\/resume\/.+\.pdf$/;

test.describe('resume', () => {
  test('the banner resume button opens the manifest-resolved PDF in a new tab', async ({ page, context }) => {
    await gotoAndSettle(page, '/');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'resume' }).click(),
    ]);

    expect(decodeURIComponent(popup.url())).toMatch(RESUME_URL_PATTERN);
    await popup.close();
  });

  test('the resume URL the button opens actually serves a PDF', async ({ page, context, request }) => {
    await gotoAndSettle(page, '/');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'resume' }).click(),
    ]);

    const url = popup.url();
    await popup.close();

    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('the resolved filename carries the YYYYMMDD date the manifest sorts on', async ({ page, context }) => {
    await gotoAndSettle(page, '/');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'resume' }).click(),
    ]);

    const filename = decodeURIComponent(popup.url()).split('/').pop() ?? '';
    await popup.close();

    // Same pattern generate-resume-manifest.js matches on. A filename that
    // drifts from it means the manifest silently fell back / picked nothing.
    expect(filename).toMatch(/^.+ \d{8}\.pdf$/);
  });
});
