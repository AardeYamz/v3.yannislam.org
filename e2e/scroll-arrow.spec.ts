import { test, expect, gotoAndSettle } from './fixtures';

// The banner's scroll-down arrow drives a hand-rolled requestAnimationFrame
// scroll (banner.component.ts's scrollToAbout/scrollEaseProgress) instead of
// CSS/browser smooth scrolling, specifically so it can glide continuously
// through the rest of the page over several seconds and cancel itself the
// instant the user takes control back. Both of those properties are easy to
// silently break — this file exercises the real animation in a real
// browser rather than only the pure easing math (covered in
// banner.component.spec.ts), to catch anything that only shows up once
// requestAnimationFrame, scroll events and the cancel listeners are all
// actually wired together on a live page.
test.describe('banner scroll-down arrow', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/');
  });

  test('appears after a short delay and scrolls the page down when clicked', async ({ page }) => {
    const arrow = page.locator('.scroll-indicator');
    await expect(arrow).toBeHidden();
    // banner.component.ts shows it via a 5s setTimeout.
    await expect(arrow).toBeVisible({ timeout: 8_000 });

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await arrow.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('scroll position advances smoothly: no long near-stationary stretch, no backward jumps', async ({ page }) => {
    const arrow = page.locator('.scroll-indicator');
    await expect(arrow).toBeVisible({ timeout: 8_000 });

    // Sample scrollY on every animation frame for ~2.5s of the scroll (it
    // runs for 6-30s total; this window is long enough to cover the
    // fixed-duration ease-in ramp with room to spare, without making the
    // test itself slow).
    await page.evaluate(() => {
      (window as any).__scrollSamples = [];
      (window as any).__sampling = true;
      const sample = (ts: number) => {
        (window as any).__scrollSamples.push([ts, window.scrollY]);
        if ((window as any).__sampling) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await arrow.click();
    await page.waitForTimeout(2_500);
    const samples = await page.evaluate(() => {
      (window as any).__sampling = false;
      return (window as any).__scrollSamples as [number, number][];
    });

    expect(samples.length).toBeGreaterThan(30); // sanity: rAF actually ran

    // Never moves backward.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i][1]).toBeGreaterThanOrEqual(samples[i - 1][1]);
    }

    // The bug this guards against: a full ease-in-out curve spread across
    // the whole (multi-second) scroll duration has near-zero velocity for
    // roughly its first second, which shows up as many consecutive frames
    // reporting the exact same (rounded) scrollY before it "catches up" —
    // a visible stutter rather than a glide. scrollEaseProgress's
    // fixed-duration ramp should be well past that within a few hundred ms,
    // so no run of stuck frames should be anywhere near this long.
    let longestStuckRun = 0;
    let currentRun = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i][1] === samples[i - 1][1]) {
        currentRun++;
        longestStuckRun = Math.max(longestStuckRun, currentRun);
      } else {
        currentRun = 0;
      }
    }
    // At 60fps a "stuck" run this long would be >150ms with zero visible
    // movement — comfortably above what any frame-to-frame float rounding
    // could produce, but well short of the >1s stall the old full-duration
    // ease produced.
    expect(longestStuckRun).toBeLessThan(10);

    // Concretely: real, visible progress within the first second — the old
    // implementation moved only ~20px in that window on this same page.
    const oneSecondIn = samples.find(([ts]) => ts - samples[0][0] >= 1000);
    expect(oneSecondIn?.[1] ?? 0).toBeGreaterThan(100);
  });

  test('stops immediately once the user scrolls manually, and does not resume on its own', async ({ page }) => {
    const arrow = page.locator('.scroll-indicator');
    await expect(arrow).toBeVisible({ timeout: 8_000 });

    await arrow.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);

    // A real wheel gesture, not window.scrollTo — the cancel listener is
    // wired to user input events, not to scroll position itself.
    await page.mouse.wheel(0, 5);

    const afterCancel = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(600);
    const settled = await page.evaluate(() => window.scrollY);

    // Should not have kept gliding on its own after the interrupt — allow a
    // small margin for the wheel's own scroll plus at most one more queued
    // animation frame, not the hundreds of pixels a further 600ms of
    // uninterrupted auto-scroll would cover.
    expect(settled - afterCancel).toBeLessThan(30);
  });
});
