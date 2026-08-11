Date: 2026-08-11 03:09:01

# Playwright E2E testing: foundation + CI wiring

## Context

`todo/playwright-e2e-testing-plan.md` audited the existing Karma/Jasmine unit
suite (117 `it()` blocks, all `TestBed` fixtures with children stubbed) and
found the gaps only a real browser closes: the boot sequence (anime.js intro,
the 1400ms `MIN_DISPLAY_MS` gate, `headerReady`), whether nav clicks actually
scroll/route, whether the theme toggle recolors the live DOM and persists,
and whether the lazy `/projects`, `/projects/highschool`, `/aardeyamz` chunks
render on a hard navigation. This doc covers implementing that plan's
foundation (§3) and P0 coverage (§4.1–4.4), and wiring it into
`.github/workflows/build-test.yml`.

Rollout was scoped to the plan's own Phase 1 + Phase 2 recommendation
("prove the server/artifact/loading-gate plumbing works in CI... before
writing more tests"): `smoke`, `home-sections`, `navigation`, `theme`. Phase
3–4 (`projects`, `resume`, `footer-and-links`, `responsive`, `assets`,
`accessibility`, visual regression) are still just the plan document —
picking those up is future work, not started here.

## What was added

- **`playwright.config.ts`** — `webServer` serves the production build
  (`dist/v3.yannislam.org/browser` via `http-server -s`) in CI, `ng serve`
  locally; `reducedMotion: 'reduce'`; Chromium + mobile (Pixel 7) projects on
  PRs, the full 4-browser matrix (`+firefox +webkit`) on push-to-`main` and
  the nightly schedule, switched via a `PLAYWRIGHT_FULL_MATRIX` env var.
- **`e2e/fixtures.ts`** — a `gotoAndSettle()` helper that waits for the
  header nav to actually be visible (never `waitForTimeout(1400)`), blocks
  `gtag.js`/Vercel Analytics/Speed Insights network calls, and unregisters
  the production build's service worker per test so one test's cached
  response can't leak into the next.
- **`e2e/{smoke,home-sections,navigation,theme}.spec.ts`** — 30 tests (60
  across both projects) covering the plan's P0 rows: boot sequence, every
  home section rendering from `config.json`, nav scroll/route behavior on
  desktop, the 3-mode theme cycle recoloring the DOM and surviving reload,
  and hard navigation to every lazy route including the wildcard redirect.
- **`npm run test:e2e`** / `test:e2e:ui` / `test:e2e:report`, plus a
  `pretest:e2e` hook mirroring the existing `pretest`/`prebuild` pattern
  (`resume-manifest.json` is gitignored and generated).
- **CI**: split the single `build-and-test` job into `unit-tests` (unchanged
  Karma matrix, Codecov path fixed — see below) → `build` (builds once,
  uploads `dist/` as an artifact) → `e2e` (`needs: build`, downloads that
  artifact instead of rebuilding, 2-way sharded). Added `push: [main]` and
  `workflow_dispatch` triggers (previously PR-only), a Monday 07:00 UTC
  schedule for the full browser matrix, and
  `concurrency: cancel-in-progress` so a rapid push sequence doesn't stack
  runs.

## Decisions made along the way

The plan's §8 flagged a few things as open decisions; here's how they landed
and why:

- **Page `<title>`**: the plan noted `index.html` ships
  `"Yannis Lam | Software Developer"` but `AppComponent.ngOnInit` used to
  overwrite it with `"Yannis Lam"` at runtime, and asked which was
  intended. That got resolved independently, in this same window, by
  `c478b5f` ("Fix SEO tags being clobbered by AppComponent during
  prerendering") — the runtime override was removed because prerendering
  (merged separately, see `20260811-013939-ssr-prerendering.md`) made it
  clobber the real SEO tags on every static page. `smoke.spec.ts` asserts
  the long form, which is now also what actually ships.
- **Codecov path**: `karma.conf.js` writes coverage to
  `coverage/v3.yannislam.org/`, but the workflow was uploading from
  `./coverage/lcov.info` — a path that never existed, silently swallowed by
  `fail_ci_if_error: false`. Fixed as part of this change since the
  workflow was already open for the job split.
- **Browser matrix on PRs**: went with the plan's recommendation
  (Chromium + mobile only) to keep PR wall clock down; full 4-browser
  coverage happens on push-to-`main` and the nightly schedule instead.
- **`MIN_DISPLAY_MS`**: left as-is, not made test-overridable — every test
  pays the ~1.4s boot cost, per the plan's own recommendation to revisit
  only if suite time becomes a real problem.
- **Visual regression**: deferred entirely, as the plan recommended — it's
  the highest-maintenance item here for a site whose content changes often.

## A real bug the tests caught

`navigation.spec.ts`'s "clicking AardeYamz navigates to /aardeyamz" test
hung for the full 30s timeout waiting on a `.nav-right ul.menu-ul` locator
that never resolved. The cause: `header.component.html` gated the *entire*
`<a>` element — nav-number badge **and** the link/title text together —
behind `@if (menuItem?.navNumber)`. The "AardeYamz" entry in
`config.json`'s `siteMenu` has no `navNumber` (it isn't a numbered in-page
section), so its link never rendered at all, in **either** the desktop nav
or the mobile drawer — the site had no working way to reach `/aardeyamz`
from the nav on any viewport. Fixed by moving the conditional to wrap only
the number badge, not the anchor itself, in both templates:

```html
<a ngbNavLink (click)='navigate(menuItem)'>
  @if (menuItem?.navNumber) {
    <span class='nav-number'>{{menuItem?.navNumber}}</span>
  }
  <span class="underline nav-text">{{menuItem?.navTitle}}</span>
</a>
```

This is exactly the class of gap the plan's §2 called out as unreachable by
`TestBed`-level unit tests, since the header spec never renders the real
composed nav.

## Notable non-obvious fixes in the test code itself

A few failures during verification were test-authoring issues rather than
app bugs, worth recording so they aren't rediscovered:

- **`<app-header>` has a permanently zero-height bounding box.** Its only
  child, `<nav class="on-top">`, is `position: fixed` and removed from
  normal flow, so the wrapping custom element always collapses to
  `height: 0` — Playwright's `toBeVisible()` requires a non-empty bounding
  box and never resolves against it. `gotoAndSettle()` and every direct
  assertion now target `app-header nav.main-navbar` instead (see
  `headerNav()` in `e2e/fixtures.ts`).
- **Playwright's default `colorScheme` is `"light"`**, not "no OS
  preference" — `theme.spec.ts` pins `colorScheme: 'dark'` (Chromium no
  longer honors the deprecated `"no-preference"` value) so `ThemeService`'s
  `prefers-color-scheme: light` check actually resolves to the app's
  `'default'` mode the way the tests expect.
- **`route.abort()` still logs its own console error** even when blocking a
  request on purpose, which would trip up a "no console errors" assertion
  covering the exact resource the fixture blocks. Switched to
  `route.fulfill()` with an empty `200 application/javascript` body instead.
  Also had to extend the block list to same-origin `/_vercel/*` paths —
  `@vercel/analytics`/`@vercel/speed-insights` fetch their script from
  there when self-hosted off Vercel's edge, and the static server's SPA
  fallback was serving `index.html` for that path, which the library then
  tried to execute as JS (`Unexpected token '<'`).
- **`smoke.spec.ts`'s failed-request check is scoped to same-origin
  responses.** `config.json` intentionally hotlinks third-party org-logo
  CDNs (that's what `LogoFallbackDirective` exists to tolerate) — treating
  a flaky/blocked third-party image as a same-origin regression would make
  the suite fail on network conditions this app is explicitly designed to
  handle gracefully.
- **The owl-carousel's copy of each work-history image starts hidden**
  until the carousel widget finishes initializing, and duplicates the same
  `img.img-feature-workhistory` class as the static thumbnail beside it.
  `home-sections.spec.ts` scopes its visibility assertion to
  `.img-feature-workhistory-container img...` (the static copy) rather than
  the first DOM match. That same assertion is skipped entirely under
  `isMobile`: below 768px (`workhistory.component.scss`), the image becomes
  a CSS `background-image` via `LogoFallbackBgDirective` instead of a
  foreground `<img>` at all — by design, not a bug.

## Running locally

```bash
npm run test:e2e            # headless, against dist/ if CI=1 else ng serve
npm run test:e2e:ui         # Playwright's interactive UI mode
npm run test:e2e:report     # open the last HTML report
```

`npx playwright install --with-deps chromium firefox webkit` is only needed
once per machine (CI installs fresh every run, cached on `package-lock.json`).
