/**
 * Lighthouse CI configuration.
 *
 * Driven by the `lighthouse` job in .github/workflows/build-test.yml, which
 * runs this twice in parallel — once per value of LH_PRESET.
 *
 * WHAT THIS DOES AND DOES NOT MEASURE
 * -----------------------------------
 * This runs against the prerendered static bundle over localhost, which is
 * the same thing Vercel serves (vercel.json points `outputDirectory` at
 * dist/v3.yannislam.org/browser) but with none of the network in between.
 *
 * That means it is a *regression detector for things this repo controls* —
 * bundle size, render-blocking resources, accessibility, SEO, layout
 * stability under throttling. It is NOT a substitute for the field data in
 * docs/todo/desktop-performance.md. TTFB in particular reads ~0ms here and
 * 1.68s in production; no localhost run will ever reproduce that.
 *
 * The `mobile` preset is the sensitive one and the reason both presets run:
 * on the measured baseline, desktop scored 93 while mobile scored 48 on the
 * same commit, and only mobile reproduced the layout shift that real users
 * actually experience. A desktop-only gate would have reported "all good".
 */

const isDesktop = process.env.LH_PRESET === 'desktop';
const PORT = 4200;

// Trailing slashes are deliberate. http-server 302s /projects -> /projects/,
// and that redirect hop costs a "Avoid multiple page redirects" penalty that
// production does not have, because Vercel serves these as clean URLs.
const paths = ['/', '/projects/', '/projects/highschool/', '/aardeyamz/'];

module.exports = {
  ci: {
    collect: {
      // Not `-s`: LHCI needs the startup banner to detect readiness.
      startServerCommand: `npx http-server dist/v3.yannislam.org/browser -p ${PORT}`,
      startServerReadyPattern: 'Available on',
      startServerReadyTimeout: 60000,
      url: paths.map((p) => `http://localhost:${PORT}${p}`),
      // Lighthouse on a shared CI runner is noisy; LHCI takes the median of
      // these runs. Do not drop this to 1 to save time — a single run swings
      // several points and turns every PR into a false alarm.
      numberOfRuns: 3,
      settings: {
        // Lighthouse's *default* is mobile (slow 4G + 4x CPU slowdown);
        // 'desktop' opts out of that throttling.
        ...(isDesktop ? { preset: 'desktop' } : {}),
        chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage',
        // Keep storage reset on (the default). This build registers a
        // service worker (ngsw-worker.js); without a reset, runs 2 and 3
        // would be served from its cache and the median would be optimistic.
        disableStorageReset: false,
      },
    },

    assert: {
      assertions: {
        // ------------------------------------------------------ deterministic
        // Byte budgets do not vary with runner load, so these are hard errors.
        // Values are the measured baseline plus headroom — see §8 of
        // docs/todo/github-actions-speed-and-hardening.md for the numbers.
        'resource-summary:script:size': ['error', { maxNumericValue: 700000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 250000 }],
        'resource-summary:font:size': ['error', { maxNumericValue: 450000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 6000000 }],

        // ------------------------------------------------------- DOM-derived
        // Also stable run-to-run. Thresholds sit below the measured baseline
        // (a11y 87 desktop / 95 mobile) so they ratchet against regression
        // rather than failing on damage that already exists.
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Known-failing today; surfaced as warnings so they show up in the
        // report without blocking. Flip to 'error' as each is fixed.
        'link-name': 'warn',
        'color-contrast': 'warn',
        'heading-order': 'warn',
        'aria-valid-attr-value': 'warn',

        // ---------------------------------------------------- timing-derived
        // Machine-dependent. Left as warnings until a baseline has been
        // captured from the GitHub runner itself, which is slower than any
        // dev box — do not promote these to 'error' using local numbers.
        'categories:performance': ['warn', { minScore: isDesktop ? 0.85 : 0.4 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        'total-blocking-time': ['warn', { maxNumericValue: 600 }],
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: './lhci-report',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.%%EXTENSION%%',
    },
  },
};
