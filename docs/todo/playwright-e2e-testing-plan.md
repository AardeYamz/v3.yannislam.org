# Playwright E2E Testing Plan

A plan for adding Playwright end-to-end testing to this repo and wiring it
into GitHub Actions, written after auditing every existing test case and the
current CI workflow.

> **Status.** Phases 1–3 have shipped; this document is kept as the original
> blueprint. Phase 1–2 (foundation, CI wiring, P0 specs) landed in
> `docs/changes/20260811-030901-playwright-e2e-testing.md`; Phase 3 (breadth:
> `projects`, `resume`, `footer-and-links`, `responsive`, `assets`) in
> `docs/changes/20260811-115249-playwright-e2e-phase-3.md`. **Phase 4
> (`accessibility.spec.ts` with axe; visual regression, deferred) is what
> remains.** §8's open decisions were all resolved — see the Phase 1–2 change
> doc.

## 1. Where things stand today

### Existing test suite

24 spec files, **117 `it()` blocks**, all Karma + Jasmine unit tests running
in `ChromeHeadless` via `karma.conf.js`:

| Area | Files | Tests | What they assert |
| --- | --- | --- | --- |
| Services | 4 | 20 | `SiteConfigService` shape/`logoKey` resolution, `ThemeService` mode cycling + persistence, `AnalyticsService` `gtag()` forwarding, `ResumeService` URL building |
| Directives | 4 | 16 | `AosDirective` IntersectionObserver wiring, `LogoFallback*` data-URI SVG generation and error swap |
| Pipes | 1 | 6 | `LinkifyPipe` anchor wrapping + HTML escaping |
| General components | 3 | 26 | `HeaderComponent` `navigate()`/`toggleTheme()`/`logoRotationDeg` math, `FooterComponent` config reads, `LoadingScreenComponent` `pieceFill()` + lifecycle |
| Home components | 9 | 44 | Mostly "should create" + "reads from config service"; `FloatingLogosComponent` generation invariants; `WorkHistoryComponent` input defaults and carousel options |
| Other components | 2 | 2 | `AardeYamzComponent` / `NamecardComponent` "should create" |
| App shell | 1 | 3 | `AppComponent` creation, `headerReady` flips on loading-screen `finished` |

Characteristics of the suite as it exists:

- Every test runs against a `TestBed` fixture with children stubbed or
  `NO_ERRORS_SCHEMA`-style shallow rendering. Nothing renders the real
  composed page.
- Roughly a third of the tests are `expect(component).toBeTruthy()` smoke
  assertions — they prove the constructor doesn't throw, not that anything
  works.
- Browser behaviors are mocked out at the seam: `scrollIntoView`,
  `IntersectionObserver`, `window.open`, `gtag`, `matchMedia`,
  `localStorage`. That is correct for unit tests, and it is exactly the
  surface E2E needs to cover for real.
- No routing integration test exists. `app-routing.module.ts` defines four
  routes plus a wildcard redirect, three of them `loadComponent` lazy
  chunks, and none of that is exercised.

### Existing CI

`.github/workflows/build-test.yml`, one job:

- Triggers on `pull_request` into `main` / `master` / `develop` only — pushes
  to `main` never run CI.
- Matrix over Node 22.x and 24.x.
- Caches `.angular/cache` keyed on `package-lock.json`.
- `npm ci` → `npm test -- --watch=false --browsers=ChromeHeadless
  --code-coverage` → Codecov upload → `npm run build` → assert `dist/`
  exists.

Two notes that matter for this plan:

1. The coverage upload points at `./coverage/lcov.info`, but `karma.conf.js`
   configures `coverageReporter.dir` as `coverage/v3.yannislam.org/`. If
   `@angular/build:karma` doesn't override that path when `--code-coverage`
   is passed, the upload has been finding no file and silently succeeding
   (`fail_ci_if_error: false` hides it). Verify against a real CI run's
   coverage output and fix the path while the workflow is open for edits.
2. The build already runs in CI and produces the exact artifact Vercel
   deploys. E2E should reuse that artifact rather than build a second time.

## 2. What E2E should and should not cover

The guiding rule: **Playwright tests must not restate what the unit tests
already prove.** `ThemeService.cycle()` ordering is covered; what is not
covered is whether clicking the header button actually recolors the page and
survives a reload.

Concretely, the gaps only a real browser can close:

| Gap | Why unit tests can't reach it | Priority |
| --- | --- | --- |
| Boot sequence: loading overlay plays, `document.body.style.overflow` is released, header mounts afterward | `AppComponent` spec only flips a boolean; the anime.js timeline and the 1400 ms `MIN_DISPLAY_MS` never run | P0 |
| Home page renders all five sections with real content from `config.json` | Every home spec stubs its children | P0 |
| Nav anchors actually scroll to `#about`, `#education`, `#workhistory`, `#volunteering` | `scrollIntoView` is a spy in the header spec | P0 |
| Lazy routes `/projects`, `/projects/highschool`, `/aardeyamz` load their chunks and render | No routing test exists at all | P0 |
| Wildcard route redirects unknown paths to `/` | Not tested | P1 |
| Theme toggle recolors the live DOM (`data-theme`, `theme-color` meta, logo swap) and persists across reload | Service tested in isolation; the CSS-variable payoff is untested | P0 |
| Mobile hamburger opens/closes the `#mobile-menu` aside, `aria-expanded` tracks it, nav items work at mobile width | No viewport-dependent test exists | P1 |
| Resume link resolves to a real PDF that returns 200 | `ResumeService` spec asserts the URL string only; the manifest→file link is unverified | P1 |
| Scroll reveal (`data-aos`) elements become visible on scroll | Directive is unit-tested against a fake observer | P2 |
| Broken org logos fall back to the generated SVG in a real `<img>` error flow | Directive tested with a synthetic error event | P2 |
| Every image/asset referenced by `config.json` returns 200 | Nothing checks assets exist on disk | P1 |
| No console errors / no failed network requests on any route | Not possible in Karma | P0 |
| Header logo rotation responds to real scroll | Math is unit-tested; the `HostListener` binding is not | P2 |
| Basic accessibility (landmarks, labels, contrast) in both themes | Out of scope for Karma | P1 |

## 3. Tooling setup

### Dependencies

```
npm i -D @playwright/test
```

Nothing else. Do not add `playwright` (the standalone lib) alongside it, and
do not add a reporter package — the built-in `html` + `github` reporters are
enough.

**Browser binaries:** the repo's `DEPLOYMENT_STATUS.md` records a local
Chromium at `/opt/pw-browsers/chromium`. Local runs should respect an
existing `PLAYWRIGHT_BROWSERS_PATH`; CI will use `npx playwright install
--with-deps` against a cache (see §5).

### What to run the tests against

Two options were considered:

- **`ng serve`** (dev server). Fast to start, HMR-friendly, but it is not
  what ships: no production optimization, no service worker, no
  `inject-env.js` substitution, different bundling.
- **The production `dist/` served statically.** Identical to what Vercel
  deploys, catches service-worker and budget regressions, and CI already
  builds it.

**Recommendation: run against the production build in CI, allow `ng serve`
locally.** Playwright's `webServer` block handles both via an env switch. The
static server should be `npx http-server` or, to avoid a new dependency,
`npx serve`-free plain Node — simplest is to add `http-server` as a dev
dependency, since SPA fallback routing (`--proxy` / `-s`) is required for
`/projects` to load on a hard navigation. Note `vercel.json` sets
`outputDirectory` to `dist/v3.yannislam.org/browser`, which is the directory
to serve.

### `playwright.config.ts`

Key decisions, with the reasoning that matters for this specific app:

```ts
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const PORT = 4200;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['blob']]
    : [['html', { open: 'on-failure' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The site is animation-heavy (anime.js intro, a RAF loop for floating
    // logos, owl-carousel autoplay, AOS transitions). Reduced motion is the
    // single biggest lever against flake.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: isCI
      ? `npx http-server dist/v3.yannislam.org/browser -p ${PORT} -s --proxy http://localhost:${PORT}?`
      : `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
```

The `--proxy http://localhost:PORT?` flag is what makes `http-server` fall
back to `index.html` for unknown paths, which the Angular router needs for
direct navigation to `/projects/highschool`.

### npm scripts

```json
"pretest:e2e": "node scripts/generate-resume-manifest.js",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

The `pretest:e2e` hook mirrors the existing `pretest` / `prebuild` hooks —
`resume-manifest.json` is gitignored and generated, so E2E must not assume it
exists.

### `.gitignore` additions

```
/test-results
/playwright-report
/blob-report
/playwright/.cache
/e2e/**/*-snapshots/**/*-actual.png
```

### Determinism controls (the part that decides whether this suite is usable)

These belong in a shared fixture at `e2e/fixtures.ts`, applied to every test:

1. **Wait past the loading screen properly.** `LoadingScreenComponent`
   sets `document.body.style.overflow = 'hidden'` in `ngAfterViewInit` and
   only calls `playOutro()` after a hard-coded 1400 ms. The header does not
   exist in the DOM until `finished` fires. Every test that touches the
   header must first await the header's presence — not a fixed sleep. A
   `gotoAndSettle(page, path)` helper should navigate, then
   `await expect(page.locator('app-header')).toBeVisible()`, then assert
   `body` scrolling is restored.
2. **Block third-party analytics.** `index.html` loads `gtag.js` from
   `googletagmanager.com`, and `AppComponent` injects Vercel Analytics and
   Speed Insights. In CI these are slow, flaky, and pollute the "no failed
   requests" assertion. Route-block them:
   `page.route('**/{googletagmanager.com,google-analytics.com,*.vercel-scripts.com}/**', r => r.abort())`.
   Where a test needs to assert an analytics call fired, stub `window.gtag`
   via `addInitScript` and read the recorded calls instead.
3. **Freeze the floating-logos RAF loop.** `FloatingLogosComponent` runs a
   custom requestAnimationFrame loop. Under `reducedMotion: 'reduce'` it may
   still animate (it is JS, not CSS), which will break any screenshot
   comparison. If visual regression is adopted (§4.9), add a
   `body.e2e-no-motion` class via `addInitScript` and have the component
   honor it, or pause via the existing visibility-pause path documented in
   `documentation/pause-floating-logos-visibility.md`.
4. **Disable Angular animations for non-animation specs.** The
   `@fadeStagger` / `@animateMenu` / `@animateFooter` triggers gate element
   visibility. Playwright's auto-waiting handles most of this, but stability
   assertions (`toHaveScreenshot`) need them off.
5. **Isolate `localStorage`.** `ThemeService` persists the mode. Playwright's
   per-test context isolation handles this by default — do not share a
   storage state across theme tests.
6. **Never hardcode copy.** All content comes from
   `src/assets/config.json`. Specs should import it
   (`import config from '../src/assets/config.json'`) and assert against it,
   so editing content doesn't break the suite. This mirrors how
   `site-config.service.spec.ts` already works.

## 4. Proposed test suite

Directory: `e2e/`, sibling to `src/`, with its own `tsconfig.json`
(`extends` the root, `types: ["node"]`, excluded from `tsconfig.app.json`).
Page objects in `e2e/pages/`, shared helpers in `e2e/fixtures.ts`.

### 4.1 `smoke.spec.ts` — P0

- `/` returns 200 and renders `app-root` with content.
- Loading overlay appears, then disappears; `app-header` is in the DOM
  afterward; `document.body.style.overflow` is no longer `hidden`.
- `<title>` is correct. **Flag:** `index.html` ships
  `Yannis Lam | Software Developer` but `AppComponent.ngOnInit` overwrites it
  with `Yannis Lam`. The test should assert the intended value — decide which
  one that is first (see §8).
- No `console.error` and no 4xx/5xx responses on any route (parameterized
  over `/`, `/projects`, `/projects/highschool`, `/aardeyamz`).

### 4.2 `home-sections.spec.ts` — P0

Driven from `config.json`:

- `#banner`, `#about`, `#education`, `#workhistory`, `#volunteering` all
  exist and are visible.
- Section headings match `about.experiences.*.headingText` and
  `navNumber`.
- Work section renders `about.experiences.work.list.length` (currently 10)
  entries; volunteering renders 6.
- Education tabs render one tab per `about.experiences.education` entry
  (currently 3); clicking each tab swaps the panel content.
- Every rendered entry shows a title, timeframe, at least one description
  paragraph, and at least one image — the invariant
  `site-config.service.spec.ts` asserts on the data, verified here on the
  DOM.

### 4.3 `navigation.spec.ts` — P0

- For each `siteMenu` entry with a `scrollSection`, clicking the nav link
  scrolls that section into the viewport (assert via
  `toBeInViewport()`, not scroll coordinates — `scrollIntoView({behavior:
  'smooth'})` makes coordinates racy).
- Clicking "Projects" navigates to `/projects`; "AardeYamz" to `/aardeyamz`.
- Header logo link returns to `/`.
- Direct navigation (hard load) to `/projects`, `/projects/highschool`,
  `/aardeyamz` renders each page — this is the SPA-fallback check.
- `/does-not-exist` redirects to `/`.
- Browser back/forward preserve expected pages.

### 4.4 `theme.spec.ts` — P0

- Default state: `html[data-theme]` and the `theme-color` meta match the
  resolved default.
- Clicking the toggle cycles `default → light → dark → default`, and on each
  step: `data-theme` updates, the header logo `src` swaps to the matching
  `assets/images/logos/*.svg`, and a representative element's computed
  `background-color` actually changes.
- Reload preserves the chosen mode (`localStorage`).
- With `colorScheme: 'light'` emulation and no stored choice, the site
  resolves to light — the OS-preference path from `theme.service.spec.ts`,
  verified end to end.

### 4.5 `projects.spec.ts` — P1

- `/projects` renders the 6 college entries with headings from
  `projects.college`.
- The "View High School Projects" link navigates to `/projects/highschool`;
  the "← Back to Projects" link returns.
- `/projects` does **not** render the high-school list (documented behavior
  in `documentation/projects-section.md`).
- Project entries with a `link` render an anchor with
  `target="_blank"` and a `rel` containing `noopener`.

### 4.6 `resume.spec.ts` — P1

- The header resume control triggers a new tab / navigation to a
  `/assets/resume/....pdf` URL.
- That URL returns HTTP 200 with `content-type: application/pdf` — catches a
  stale or missing manifest, which is the actual failure mode this guards.

### 4.7 `footer-and-links.spec.ts` — P1

- Footer renders one social link per `about.contact` entry (6 currently),
  each with a valid `href` and `target="_blank"`.
- Email link is a `mailto:` matching config.
- Repo / built-with / design-credit links carry
  `rel="nofollow noopener noreferrer"`.
- Copyright year matches the current year.
- **Optional, `@external` tagged and excluded from PR runs:** HEAD each
  external URL for a non-404. Run on a schedule only — external sites will
  otherwise make PRs red for reasons unrelated to the diff.

### 4.8 `responsive.spec.ts` — P1

Runs only in the `mobile` project:

- Desktop nav is hidden; hamburger is visible.
- Clicking the hamburger sets `aria-expanded="true"` and shows
  `#mobile-menu`; clicking a nav item closes it (`responsiveMenuVisible`
  resets in `scroll()` / `navigate()`).
- Mobile footer contact block is visible, desktop side bars are not.
- No horizontal overflow at 375 px width.

### 4.9 `assets.spec.ts` — P1

- Walk `config.json`'s `logos` map plus every `imgs[]` in
  `experiences.work`, `experiences.volunteering`, `projects.college`,
  `projects.highschool`, and assert each path returns 200 from the served
  build. This is a fast request-level test with no page rendering, and it
  catches the most common content-editing mistake in this repo.
- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `favicon.ico` all
  return 200 — regression cover for `documentation/seo-fixes.md`.
- Every route listed in `sitemap.xml` loads.

### 4.10 `accessibility.spec.ts` — P1

Add `@axe-core/playwright`:

- Axe scan of `/`, `/projects`, `/aardeyamz` in both light and dark themes,
  failing on `serious` and `critical` violations only, with a documented
  allowlist for known third-party (owl-carousel, ng-bootstrap) findings.
- Explicit checks for the fixes in
  `documentation/fix-hamburger-menu-accessibility.md`: hamburger has
  `aria-label` and `aria-controls="mobile-menu"`, theme toggle's
  `aria-label` reflects the current mode, brand link has
  `aria-label="Yannis Lam, home"`.

### 4.11 `visual.spec.ts` — P2, optional, opt-in

Screenshot comparison of the home page in both themes, Chromium only,
`maxDiffPixelRatio: 0.02`. **Only worth adding once §3's motion controls are
proven stable.** Snapshots must be generated in the same container CI uses
(font rendering differs between macOS and Linux), so pin snapshot generation
to a `--update-snapshots` run inside the CI image. If that overhead isn't
acceptable, skip this file entirely — the rest of the suite carries most of
the value.

### Rough sizing

~55–70 tests across the P0/P1 files, ~2–4 minutes wall clock in Chromium
alone, ~6–10 minutes across four browser projects with 2 workers.

## 5. GitHub Actions integration

### Structure: split the existing workflow into three jobs

The current single job does unit tests *and* builds, twice (Node 22 and 24).
E2E needs the build artifact, and rebuilding it a third time is waste. The
proposed shape:

```
unit-tests   (matrix: node 22, 24)  ─┐
build        (node 22, uploads dist) ─┼─→ e2e (matrix: shard 1/2, 2/2)
                                      ┘
```

- **`unit-tests`** — the existing steps minus the build, with the Codecov
  path corrected to `./coverage/v3.yannislam.org/lcov.info`.
- **`build`** — `npm ci && npm run build`, then
  `actions/upload-artifact` the `dist/` directory with a short
  `retention-days: 1`.
- **`e2e`** — `needs: build`, downloads the artifact, installs only the
  browsers it needs, runs Playwright against the static server.

Keeping E2E in the same file (`build-test.yml`) is fine and keeps one
required status context; a separate `e2e.yml` is only worth it if E2E needs a
different trigger cadence than unit tests.

### The E2E job

```yaml
  e2e:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v4.1.7

      - uses: actions/setup-node@v4.0.3
        with:
          node-version: 22.x
          cache: 'npm'

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: pw-cache
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium firefox webkit

      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}/2
        env:
          CI: true

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-${{ matrix.shard }}
          path: |
            playwright-report/
            test-results/
            blob-report/
          retention-days: 7
```

Details worth getting right:

- **Cache key on `package-lock.json`, and still run `playwright install`
  unconditionally.** On a cache hit the install is a fast no-op verification;
  skipping it via `if: cache-miss` breaks whenever `--with-deps` system
  libraries are needed but the browser cache is warm.
- **`--with-deps` is required on `ubuntu-latest`** for WebKit and Firefox
  system libraries.
- **`fail-fast: false`** so one shard's failure doesn't hide the other's
  results.
- **Sharding at 2** to start. The blob reporter lets shards be merged into
  one HTML report with `npx playwright merge-reports` in a follow-up job if
  the split reports become annoying.
- **Upload reports on failure and success** (`!cancelled()`) — traces and
  videos from `on-first-retry` are the whole debugging story for a flaky E2E
  failure.

### Trigger changes

The current workflow only runs on PRs into `main`/`master`/`develop`. Two
changes are worth making alongside this work:

```yaml
on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main]
  workflow_dispatch:
```

Running on push to `main` means a merge that breaks E2E is caught even if the
PR was merged stale; `workflow_dispatch` makes it possible to re-run after a
flaky external failure without an empty commit.

Optionally, a nightly schedule for the `@external` link-check tests:

```yaml
  schedule:
    - cron: '0 7 * * 1'   # Mondays, 07:00 UTC
```

### Concurrency

Add to the workflow so superseded PR pushes cancel their in-flight runs —
E2E is the most expensive job here and stacking runs on a rapid push sequence
wastes minutes:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### PR annotation

The `github` reporter already annotates failing lines in the PR diff view.
Nothing extra is needed; skip a separate comment-posting action.

### Cost control

Four browser projects × the full suite on every PR is more than this site
needs. Recommended split:

- **On PRs:** Chromium + mobile only (`--project=chromium --project=mobile`).
- **On push to `main` and on schedule:** all four projects.

Implemented with a single `PLAYWRIGHT_PROJECTS` env var branching on
`github.event_name`.

## 6. Known flake sources in this codebase

Collected here because each one has already bitten the unit suite or is
visible in the source:

1. **The 1400 ms `MIN_DISPLAY_MS` loading gate.** Every test pays it. Never
   `waitForTimeout(1400)` — wait for `app-header`. Consider exposing the
   constant as a build-time-overridable value so E2E can shorten it; that is
   a source change and should be a separate decision (§8).
2. **`scrollIntoView({ behavior: 'smooth' })`.** Assert with
   `toBeInViewport()`, never on `window.scrollY`.
3. **owl-carousel autoplay.** `WorkHistoryComponent`'s carousel loops
   automatically, so the visible slide changes under the test. Assert on the
   carousel container or the entry title, not on a specific slide.
4. **anime.js `outElastic` easing** overshoots — elements are briefly
   scaled/rotated past their resting transform. Only assert on the loading
   screen's final state.
5. **Font loading (Calibre, SF Mono, Font Awesome).** Layout shifts until
   fonts settle. `document.fonts.ready` in the settle helper avoids this for
   any geometry assertion.
6. **Service worker.** The production build enables `ngsw-config.json`. A
   registered SW can serve stale content across tests in the same context.
   Either unregister it in an init script or accept it and test the SW
   behavior deliberately — do not leave it ambiguous.
7. **`@vercel/analytics` and `@vercel/speed-insights`** fire real network
   requests in the built bundle. Block them (§3).

## 7. Rollout

**Phase 1 — foundation (smallest useful PR).**
`@playwright/test` + `http-server` dev deps, `playwright.config.ts`,
`e2e/fixtures.ts`, `e2e/smoke.spec.ts`, npm scripts, `.gitignore`. CI: the
job split and a Chromium-only E2E job. Merge this before writing more tests
— it proves the server/artifact/loading-gate plumbing works in CI, which is
where the real risk is.

**Phase 2 — core coverage.** `home-sections`, `navigation`, `theme`. These
are the P0 gaps. Add the `mobile` project.

**Phase 3 — breadth.** `projects`, `resume`, `footer-and-links`,
`responsive`, `assets`. Add Firefox and WebKit on push-to-`main` only.

**Phase 4 — quality gates.** `accessibility` with axe. Nightly external link
check. Visual regression only if Phase 1–3 have been stable for a couple of
weeks.

### Acceptance criteria

- E2E job is green on three consecutive PRs with zero retries needed.
- Total PR CI wall clock stays under ~10 minutes.
- Every P0 gap in §2 has at least one covering test.
- A deliberately broken `config.json` image path fails `assets.spec.ts`.
- A deliberately broken route fails `navigation.spec.ts`.

## 8. Decisions needed before implementation

1. **Page `<title>`.** `index.html` says `Yannis Lam | Software Developer`;
   `AppComponent.ngOnInit` overwrites it with `Yannis Lam`. The runtime value
   is what search engines and browser tabs see. Which is intended? The smoke
   test needs one answer, and the SEO work in
   `documentation/seo-fixes.md` suggests the longer form was deliberate.
2. **Should `MIN_DISPLAY_MS` be overridable for tests?** Shortening it in E2E
   saves ~1.4 s per test (roughly 90 s across the suite), but it means E2E
   runs against a slightly different app than users get. Recommendation: keep
   it, pay the cost, and revisit only if suite time becomes a problem.
3. **Browser matrix on PRs.** Chromium + mobile is the recommendation; full
   four-browser coverage on every PR is defensible if minutes aren't a
   concern.
4. **Visual regression at all?** It is the highest-maintenance item in this
   plan for a site whose content changes often. Recommendation: defer, and
   only adopt if a visual regression actually ships to production first.
5. **Codecov path fix** — in scope for this work or a separate PR? It is a
   one-line change in a file this work already edits.
