# Yannis Lam Portfolio Website v.3

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22%20%7C%2024-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Build & Test](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml)
[![Security](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/security.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/security.yml)
[![Dependabot](https://img.shields.io/badge/dependencies-Dependabot-025E8C?logo=dependabot&logoColor=white)](.github/dependabot.yml)
[![Playwright](https://img.shields.io/badge/E2E-Playwright%201.62-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![DNS & Email by Cloudflare](https://img.shields.io/badge/DNS%20%26%20Email-Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Google Analytics](https://img.shields.io/badge/Analytics-Google%20Analytics-E37400?logo=googleanalytics&logoColor=white)](https://analytics.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 19, and later updated to version 22.
- Forked from [Lê Thanh Tuấn's Portfolio](https://github.com/lethanhtuan939/Portfolio)
- Which was based on [José Hernández's Portfolio](https://github.com/andresjosehr/andresjosehr-portfolio)
- And adapted from [Brittany Chiang's Portfolio](https://github.com/bchiang7/v4)

## Getting Started

### Prerequisites
You need to have npm and Angular CLI installed in your pc. Npm is available with NodeJS in [here](https://nodejs.org/). After you install npm, install Angular CLI with the following command in your terminal

``` bash
npm install -g @angular/cli
```

### Installing

Just clone  the repo and excecute the following command inside the folder project

``` bash
npm install
```

### All done!

Now just run
```
npm start
```
or
```
ng serve
```

Wait to compile and go to [http://localhost:4200](http://localhost:4200) after compile finish

### Development server

The application will automatically reload if you change any of the source files.

## Stack

**Framework & language**
- [Angular](https://angular.dev) 22 (`@angular/cli`, `@angular/core`, `@angular/router`, `@angular/animations`, `@angular/forms`) — `NgModule`-based app shell, with a few standalone components (`AardeYamzComponent`, `NamecardComponent`) lazy-loaded off the router
- TypeScript 6, strict mode + `strictTemplates`

**UI & content**
- [@ng-bootstrap/ng-bootstrap](https://ng-bootstrap.github.io/) 21 + [Bootstrap](https://getbootstrap.com/) 5 — layout, nav (`ngbNav`), dropdowns
- [@fortawesome/fontawesome-free](https://fontawesome.com/) 7 — iconography
- [ngx-typed-js](https://www.npmjs.com/package/ngx-typed-js) — the banner's typewriter effect
- [ngx-owl-carousel-o](https://www.npmjs.com/package/ngx-owl-carousel-o) — work history carousel
- [animejs](https://animejs.com) 4 — the boot-time loading screen's logo assembly animation (see `docs/changes/20260728-132036-animejs-loading-screen.md`)
- AOS-style scroll reveal via a custom `AosDirective` (`src/app/directives/aos/`)
- A hand-rolled `requestAnimationFrame` loop powers `FloatingLogosComponent`, a field of falling logo marks behind the banner greeting (see `docs/changes/20260729-090717-floating-logos-banner.md`)
- `LogoFallbackDirective` (`src/app/directives/logo-fallback/`) generates a data-URI SVG placeholder — the organization's name as themed accent-colored text — for work/education entries with no logo image
- All page copy (nav, banner, about, education, work history, contact, footer socials) is data-driven from `src/assets/config.json`, read through a single `SiteConfigService` (see `docs/changes/20260728-160203-config-dedup-refactor.md`)

**Analytics**
- Google Analytics 4 via the global `gtag.js` site tag, loaded inline in `src/index.html`; `AnalyticsService` calls the global `gtag()` directly — no analytics npm package is used (an earlier `ngx-google-analytics` integration was removed since it was never wired up) — see `docs/changes/20260727-205542-google-analytics-1.md`

**Infrastructure & deployment**
- **Hosting/build**: [Vercel](https://vercel.com) builds and serves the production app (`vercel.json`); a `postbuild` step (`scripts/inject-env.js`) substitutes `%GOOGLE_ANALYTICS_ID%` in `index.html` from Vercel's environment at build time so the ID isn't hardcoded in source
- **DNS, CDN proxy & email**: [Cloudflare](https://www.cloudflare.com/) manages the `yannislam.org` zone — proxied `A`/`CNAME` records in front of Vercel, plus Cloudflare Email Routing (MX/SPF/DKIM/DMARC) for `@yannislam.org` mail
- Legacy/preview subdomains (`alpha.`, `v1.`, `v2.`) still resolve to Netlify via Cloudflare CNAMEs from earlier iterations of this site

## Architecture

```mermaid
flowchart TB
    Main["main.ts"] --> AppModule --> App["AppComponent"]

    subgraph Shell["App shell"]
        Loading["LoadingScreen"]
        Header
        Outlet{{"router-outlet"}}
        Footer
    end
    App --> Loading & Header & Outlet & Footer

    Outlet -->|"''"| Home
    Outlet -->|"'aardeyamz' (lazy)"| AardeYamz

    subgraph HomeModule["HomeModule (eager)"]
        Home --> Banner & About & Education & Work["WorkHistory x2"] & Contact
        Banner --> Floating["FloatingLogos"]
    end

    Config[("config.json")] --> SiteConfig["SiteConfigService"]
    SiteConfig --> Header & Footer & Banner & Home & Education & AardeYamz

    Theme["ThemeService"] --> Header & Loading & Floating & Work

    Analytics["AnalyticsService"] --> Header & Banner & About & Footer & Contact
    Analytics -->|"gtag"| GA[("Google Analytics")]
```

| Piece | Kind | What it does |
|---|---|---|
| `main.ts` → `AppModule` → `AppComponent` | Bootstrap | `NgModule`-based root; `AppComponent` hosts the shell below |
| `LoadingScreenComponent` | Shell | Boot-time anime.js logo-assembly intro |
| `HeaderComponent` | Shell | Nav bar and theme toggle |
| `FooterComponent` | Shell | Repo link, "built with" credit, design credits |
| `router-outlet` | Shell | Swaps the routed page in; see [routes](#routes) |
| `HomeComponent` | Page (eager `HomeModule`) | Composes the sections below on `/` |
| `BannerComponent` | Home section | Hero greeting and typewriter effect |
| `FloatingLogosComponent` | Home section | Field of falling logo marks behind the banner greeting; recolors on theme toggle |
| `AboutComponent`, `EducationComponent`, `ContactComponent` | Home sections | Read their copy from `SiteConfigService` |
| `WorkHistoryComponent` (x2) | Home section | One instance for work, one for volunteering; uses the `logoFallback` directive and takes the theme accent color |
| `AardeYamzComponent` + `NamecardComponent` | Page (lazy chunk) | Standalone `/aardeyamz` route |
| `SiteConfigService` | Service | Only reader of `src/assets/config.json`; feeds Header, Footer, Banner, Home, Education and AardeYamz |
| `ThemeService` | Service | Light/dark/default theme via signals + `localStorage`; feeds Header, LoadingScreen, FloatingLogos and WorkHistory |
| `AnalyticsService` | Service | Calls the global `gtag()` for events and pageviews; used by Header, Banner, About, Footer and Contact |

#### Routes

| Path | Loaded | Component |
|---|---|---|
| `''` | Eager (`HomeModule`) | `HomeComponent` |
| `aardeyamz` | Lazy (`loadComponent`) | `AardeYamzComponent` |

### Deployment & DNS

#### CI/CD pipeline

```mermaid
flowchart TB
    PR["Pull request"] --> CI
    Push["Push to main"] --> CI
    Cron["Monday cron"] --> CI
    Manual["workflow_dispatch"] --> CI

    subgraph CI["Build & Test"]
        Unit["unit-tests"]
        Build["build"]
        Lighthouse["lighthouse"]
        E2E["e2e"]
        DepReview["dependency-review"]
        Build --> Lighthouse & E2E
    end

    PR --> Sec["Security"]
    Push --> Sec
    Cron --> Sec

    CI & Sec --> Gate{"All green?"}
    Gate -->|"no"| Fix["Fix and re-push"]
    Fix -.-> PR
    Gate -->|"yes"| Merge["Merge to main"]

    Merge --> Vercel["Vercel build + deploy"]
    Vercel --> Edge["Vercel Edge"]
    Vercel -->|"deployment_status"| Release["Release: tag + notes"]
    Merge --> Sync["Merge main into PRs"]
```

A push that supersedes an in-flight run (e.g. two commits pushed to the same
PR seconds apart) cancels the older run via `concurrency: cancel-in-progress`
— `e2e` is the most expensive job here, so stacked runs on a rapid push
sequence would otherwise waste CI minutes. Pushes to `main` are never
cancelled, so `main` always keeps a green run of its own.

#### Build & Test jobs (`build-test.yml`)

| Job | Runs on | Needs | What it does |
|---|---|---|---|
| `unit-tests` | Matrix: Node 24.x, 26.x (both must pass) | — | `npm ci`, then `npm test -- --watch=false --browsers=ChromeHeadless --code-coverage` (Karma + Jasmine, 117 specs against `TestBed` fixtures); uploads `coverage/v3.yannislam.org/lcov.info` to [Codecov](https://codecov.io) |
| `build` | Node 24.x | — | `npm run build`: Angular AOT build that prerenders every known route (`/`, `/projects`, `/projects/highschool`, `/aardeyamz`, `**`) to static HTML (see `docs/changes/20260811-013939-ssr-prerendering.md`); verifies `dist/` exists and uploads it as an artifact (`retention-days: 1`) |
| `lighthouse` | Matrix: `mobile`, `desktop` | `build` | Lighthouse against the `build` artifact. Mobile applies slow-4G + 4x-CPU throttling and is the only preset that reproduces the real layout shift; desktop matches the field metric in `docs/todo/desktop-performance.md` |
| `e2e` | 2 shards, `fail-fast: false` | `build` | Installs Playwright browsers (cached on `package-lock.json`), downloads the `build` artifact (no rebuild) and runs `playwright test` against it through a static server. Chromium + mobile on PRs; adds Firefox + WebKit on push to `main` and on the schedule (see [E2E Testing](#e2e-testing-playwright)). Always uploads the HTML report, traces and videos, pass or fail |
| `dependency-review` | PRs only | — | `actions/dependency-review-action`; fails on severity `high` or above |

#### Merge gating and deployment

| Stage | What happens |
|---|---|
| Merge gate | Every job above (both `unit-tests` legs, `build`, both `lighthouse` presets, both `e2e` shards) must pass for the PR to become mergeable. Any failure blocks the merge; fix and push to re-run |
| Merge | A passing PR merged into `main` triggers Vercel's Git integration |
| Vercel build | `ng build`, then the `postbuild` step `scripts/inject-env.js` substitutes `%GOOGLE_ANALYTICS_ID%` from Vercel's environment |
| Serve | Vercel Edge serves the static bundle; Cloudflare DNS routes `yannislam.org` to it |
| Release | `release.yml` fires on Vercel's successful *Production* `deployment_status` for `main` and creates a `vYYYYMMDDHHMMSS` tag and GitHub release |
| PR sync | `sync-prs.yml` merges the new `main` into every open PR branch that is behind |

#### DNS & content delivery

```mermaid
flowchart LR
    Visitor["Visitor"] -->|"DNS lookup"| CF["Cloudflare DNS"]
    CF -->|"proxied A/CNAME"| Vercel["Vercel Edge"]
    Vercel -->|"serves site"| Visitor

    CF --> Mail["Cloudflare Email Routing"] --> Inbox["@yannislam.org inbox"]
    CF -.->|"legacy CNAMEs"| Netlify["Netlify (older sites)"]
```

| Concern | Provider | Details |
|---|---|---|
| DNS zone | Cloudflare | Manages the `yannislam.org` zone |
| Site hosting | Vercel | Proxied `A`/`CNAME` records point at Vercel Edge, which serves the static bundle |
| Email | Cloudflare Email Routing | MX/SPF/DKIM/DMARC for `@yannislam.org`, delivered to the inbox |
| Legacy sites | Netlify | `alpha.`, `v1.` and `v2.` subdomains still resolve to Netlify via Cloudflare CNAMEs from earlier iterations of this site |

### Automation

#### Scheduled jobs

All times UTC. The two Monday crons are staggered so each sees what the one before it produced.

| When | What | Source | Purpose |
|---|---|---|---|
| Mondays 06:00 | Dependabot version updates (`npm` + `github-actions`) | [`dependabot.yml`](.github/dependabot.yml) | Opens the weekly bump PRs, batched by group |
| Mondays 06:30 | `Security` workflow | [`security.yml`](.github/workflows/security.yml) | zizmor lint of the workflow files, 30 minutes behind Dependabot |
| Mondays 07:00 | `Build & Test` workflow | [`build-test.yml`](.github/workflows/build-test.yml) | Full 4-browser Playwright matrix plus the external-link checks in `footer-and-links.spec.ts` that PR runs exclude |

#### Workflows and automations

| Name | Trigger | What it does | Source |
|---|---|---|---|
| Build & Test | PR to `main`/`master`/`develop`; push to `main`; Monday 07:00; manual | Unit tests, build, Lighthouse, E2E, dependency review (see [jobs](#build--test-jobs-build-testyml)) | [`build-test.yml`](.github/workflows/build-test.yml) |
| Security | PR to `main`/`master`/`develop`; push to `main`; Monday 06:30; manual | `Lint workflows (zizmor)` | [`security.yml`](.github/workflows/security.yml) |
| Release | Vercel `deployment_status` | On a successful Production deploy of `main`, creates a `vYYYYMMDDHHMMSS` tag and release pinned to the deployed commit; one release per commit | [`release.yml`](.github/workflows/release.yml) |
| Merge main into PRs | Push to `main`; manual | Merges `main` into each open PR branch that is behind; conflicting PRs get a comment once per `main` commit; fork and Dependabot PRs are skipped | [`sync-prs.yml`](.github/workflows/sync-prs.yml) |
| Dependabot auto-merge | `pull_request_target` to `main` | For Dependabot PRs only: waits for all checks, then merges patch/minor bumps and dev-only majors; production majors are left for review | [`dependabot-auto-merge.yml`](.github/workflows/dependabot-auto-merge.yml) |
| Dependabot updates | Monday 06:00 | Weekly version updates for `npm` and `github-actions`; security updates are batched into one PR by the `security-updates` group | [`dependabot.yml`](.github/dependabot.yml) |
| CodeQL | Push, PR (GitHub default setup, no workflow file) | Code scanning, configured in the repository's security settings | — |
| Vercel | Push to any branch, via the Vercel Git integration | Production deploy for `main`, preview deploy for everything else | [`vercel.json`](vercel.json) |

## Code Structure

```
.github/
├── workflows/                # CI/CD and automation, see "Automation" above
│   ├── build-test.yml
│   ├── security.yml
│   ├── release.yml
│   ├── sync-prs.yml
│   └── dependabot-auto-merge.yml
├── dependabot.yml
e2e/                          # Playwright E2E specs — see "E2E Testing" below
├── fixtures.ts               # gotoAndSettle() boot-wait helper, analytics blocking, SW isolation
├── smoke.spec.ts
├── home-sections.spec.ts
├── navigation.spec.ts
└── theme.spec.ts
playwright.config.ts
src/
├── app/
│   ├── animations/           # Shared Angular animation triggers (e.g. fade-stagger)
│   ├── components/
│   │   ├── general/          # Chrome shared across every route
│   │   │   ├── header/       # Nav bar + theme toggle
│   │   │   ├── footer/       # Footer (repo link, built-with, design credits)
│   │   │   └── loading-screen/  # Boot-time anime.js logo intro
│   │   ├── home/             # Sections that make up the "/" route (HomeModule, eager)
│   │   │   ├── banner/       # Hero banner + typewriter effect
│   │   │   ├── floating-logos/  # Falling logo-mark field behind the banner greeting
│   │   │   ├── about/        # About + AardeYamz name-meaning cards
│   │   │   ├── education/    # Education list
│   │   │   ├── workhistory/  # Work/volunteering timeline (reused for both)
│   │   │   ├── contact/      # Contact section
│   │   │   ├── projects/     # College projects
│   │   │   └── projects-highschool/  # High school projects
│   │   └── other/
│   │       └── aardeyamz/    # Standalone "/aardeyamz" route, lazy-loaded (+ NamecardComponent)
│   ├── directives/
│   │   ├── aos/               # Custom scroll-reveal directive (AOS-style)
│   │   └── logo-fallback/     # Generates a themed placeholder logo SVG when no image is set
│   ├── pipes/linkify/        # Turns plain-text URLs into links
│   ├── services/
│   │   ├── site-config/      # SiteConfigService — the only reader of assets/config.json
│   │   ├── theme/            # ThemeService — light/dark theme, signals + localStorage
│   │   ├── analytics/        # AnalyticsService — calls the global gtag() directly
│   │   └── resume/           # Resume link/download handling, reads assets/resume-manifest.json
│   ├── app.module.ts         # Root NgModule (eager HomeModule, lazy AardeYamz route)
│   └── app-routing.module.ts # Top-level routes
├── assets/
│   ├── config.json           # All page copy/content — see "Updating the config file" below
│   ├── resume-manifest.json  # Generated at build/serve time — see note below (gitignored)
│   ├── fonts/                # Calibre, SF Mono
│   ├── images/                # Logos, profile photos, project screenshots
│   └── resume/                # Downloadable resume file(s)
└── enviroment/                # Angular environment files
```

`scripts/generate-resume-manifest.js` runs as a `pre*` hook before `start`,
`build`, `watch`, and `test` (see `package.json`). It scans
`src/assets/resume/` for files named `<anything> YYYYMMDD.pdf`, picks the
newest by date, and writes its filename to `src/assets/resume-manifest.json`,
which `ResumeService` imports as a TS module — so dropping in a new dated
resume PDF is all that's needed to update the site's download link, no code
change required.

Every component under `components/` follows the standard Angular trio
(`*.component.ts` / `.html` / `.scss`, plus a `.spec.ts` where present).
Components read content through `SiteConfigService` rather than importing
`config.json` directly — see `docs/changes/20260728-160203-config-dedup-refactor.md` for why.
Other write-ups worth skimming when touching a specific area live in
`docs/changes/` (loading screen animation, Google Analytics wiring, the
projects and volunteering sections, the falling-logos banner background,
SVG logo conversion + the 3-state light/dark theme system, the header's
scroll-translucency and left-to-right entrance animation, and Angular
version upgrade notes).

## Updating the Config File

Nearly all page content — nav labels, bio text, work/education/volunteering
history, project write-ups, footer links, and site metadata — is data-driven
from [`src/assets/config.json`](src/assets/config.json). To personalize this
site for your own use, you generally only need to edit that file; component
templates shouldn't need to change.

Key sections:

- **`siteMenu`** — top nav items. Each entry needs `navTitle`, `siteLocation`
  (route or `/#anchor`), and optionally `navNumber`/`navContent`/`scrollSection`
  for in-page sections.
- **`logos`** — a keyed map of `{ src, alt }` image references, reused by
  `logoKey` across `experiences.work.list`, `experiences.education`, and
  `experiences.volunteering.list` so a logo is only defined once. If an
  entry's `logoKey` is omitted or its `src` is empty, the `logoFallback`
  directive auto-generates a themed placeholder (the organization's name as
  wrapped, accent-colored text) instead — no image asset required.
- **`about`** — `first`/`last` name, `email`, the `contact` list (social
  links, each with an `icon` matching a Font Awesome class), and the
  `aardeyamz` array powering the name-meaning cards.
- **`about.experiences`** — `work` and `volunteering` each have a `list` of
  entries (`organization`, `title`, `timeframe`, `description[]`, `skills[]`,
  optional `logoKey`/`link`/`about`/`tab`), plus a top-level `education`
  array in the same shape. `skills` at the bottom of `experiences` is the
  flat skills summary shown separately from any one job.
- **`banner`** — hero `greeting`/`name`/`blurb` and the `typeSection` array
  cycled by the typewriter effect.
- **`footer`** — repo link, "built with" credit, and `designCredits`.
- **`projects.college` / `projects.highschool`** — each a `list` of
  `{ imgs[], title, timeframe, description[], link? }` project cards.
- **`siteTitle`, `heading`, `subHeading`, `manifest*`** — page `<title>` and
  PWA manifest fields (name, short name, start URL, theme/background colors,
  icon).

Image `src` values can be either a hosted URL or a path under `src/assets/`.
There's no JSON schema enforced at build time, so keep new entries consistent
with the shape of existing ones in the same array. After editing, `npm start`
/ `ng serve` picks up changes on save like any other source file.

## Testing

The project uses **Karma** and **Jasmine** for unit testing with a headless Chrome browser:

### Running Tests

```bash
# Run tests in headless mode (CI-friendly)
npm test -- --watch=false

# Run tests with auto-reload on file changes (development)
npm test

# Run tests with code coverage
npm test -- --watch=false --code-coverage
```

### Environment Setup

Tests require Chromium to be available. In this project:
- **Chromium Path**: `/opt/pw-browsers/chromium`
- **Karma Config**: `karma.conf.js`
- **Test Configuration**: `tsconfig.spec.json`

The `CHROME_BIN` environment variable is set automatically by the test runner when using the pre-installed Chromium binary:

```bash
CHROME_BIN=/opt/pw-browsers/chromium npm test -- --watch=false
```

### Test Coverage

Run tests with coverage reporting:

```bash
npm test -- --watch=false --code-coverage
```

## E2E Testing (Playwright)

Unit tests above run every spec against a `TestBed` fixture with children
stubbed — real page composition, boot-time animation, nav clicks, and theme
switching aren't exercised at all there. [Playwright](https://playwright.dev)
end-to-end tests in `e2e/` close that gap by driving a real browser against
the actual built app. See
`docs/changes/20260811-030901-playwright-e2e-testing.md` for the full
write-up (what's covered, why, and non-obvious fixture decisions);
`docs/todo/playwright-e2e-testing-plan.md` for the original plan this implements
(P0 coverage so far — P1/P2 phases like `projects`/`resume`/`accessibility`
specs and visual regression are still just that document, not yet built).

### Running Tests

```bash
# Headless — against the production build in CI (CI=1), against `ng serve` locally
npm run test:e2e

# Playwright's interactive UI mode (recommended for writing/debugging specs)
npm run test:e2e:ui

# Open the last run's HTML report (traces, screenshots, videos on failure)
npm run test:e2e:report
```

Locally, `npm run test:e2e` starts its own `ng serve` dev server via
Playwright's `webServer` config (`reuseExistingServer` if one's already
running) — no separate build step needed. In CI, it instead serves the
`build` job's `dist/v3.yannislam.org/browser` output through a static
server with SPA-fallback routing, matching what Vercel actually deploys.

### Browser Setup

```bash
npx playwright install --with-deps chromium firefox webkit
```

Only needed once per machine — CI installs fresh on every run, cached on
`package-lock.json` so a cache hit is a fast no-op verification rather than
a full re-download.

### What's covered

- **`smoke.spec.ts`** — the boot sequence (loading overlay → header mounts →
  `document.body` scroll restored), the page `<title>`, and zero console
  errors / failed same-origin requests on every route
- **`home-sections.spec.ts`** — every home-page section (banner, about,
  education, work, volunteering) renders real content sourced from
  `config.json`, not hardcoded copy
- **`navigation.spec.ts`** — desktop nav scroll-to-section and route clicks,
  hard navigation to every lazy-loaded route, the wildcard-to-`/` redirect,
  and browser back/forward
- **`theme.spec.ts`** — the `default → light → dark → default` cycle
  actually recolors the live DOM (not just the service's internal signal),
  persists across reload via `localStorage`, and resolves correctly from the
  OS `prefers-color-scheme` when nothing's stored

Determinism controls worth knowing about if you're adding a spec: never
`waitForTimeout()` past the loading screen — use `gotoAndSettle()` from
`e2e/fixtures.ts`, which waits for the header nav to actually be visible.
Third-party analytics requests (`gtag.js`, Vercel Analytics/Speed Insights)
are blocked automatically for every test via the same fixture.

Coverage reports are uploaded to [Codecov](https://codecov.io) automatically by the GitHub Actions CI/CD pipeline on every PR. View coverage metrics and trends at the project's [Codecov dashboard](https://codecov.io).

## Dependency Security

Two tools split the job, because neither does the whole of it well:

- **[Dependabot](https://docs.github.com/en/code-security/dependabot)** opens
  the bump PRs. `.github/dependabot.yml` configures the weekly *version*
  updates (Monday 06:00 UTC) for both `npm` and `github-actions`; the
  alerts-driven *security* updates come from the repository's security
  settings and are batched into a single PR by the `security-updates` group.
- **[Aikido](https://www.aikido.dev)** triages. Dependabot will happily open a
  PR for a critical advisory in a transitive dev dependency that no shipped
  code path can reach; Aikido scans the repo and tells you whether the
  finding is actually reachable, so the PR queue stays signal.

Bumps are grouped rather than one-per-package: `angular` (the `@angular/*`
packages plus the libraries pinned to an Angular major, which have to move in
lockstep or the workspace won't build), `testing`, and a `minor-and-patch`
catch-all. Majors are deliberately left ungrouped so each arrives alone and
can be reverted alone — and Angular majors are ignored outright, since they're
upgraded by hand through `ng update` and its migration schematics (see
`docs/changes/20260727-205542-UPGRADE-NOTES.md`).

Aikido runs as a GitHub App with PR gating configured in the Aikido
dashboard, so there is no Aikido job or CI secret in this repo. (The old
`AikidoSec/github-actions-workflow` job was removed because Aikido no longer
recommends it; see `docs/changes/20261021-000000-remove-aikido-workflow.md`.)
Background on the original Dependabot + Aikido setup is in
`docs/changes/20260811-124323-dependabot-aikido-integration.md`.
