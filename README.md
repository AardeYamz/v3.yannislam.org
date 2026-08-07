# Yannis Lam Portfolio Website v.3

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Build & Test](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Tests](https://img.shields.io/badge/Tests-118%2F118%20passing-brightgreen?logo=jasmine&logoColor=white)](DEPLOYMENT_STATUS.md)
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
- [animejs](https://animejs.com) 4 — the boot-time loading screen's logo assembly animation (see `documentation/animejs-loading-screen.md`)
- AOS-style scroll reveal via a custom `AosDirective` (`src/app/directives/aos/`)
- A hand-rolled `requestAnimationFrame` loop powers `FloatingLogosComponent`, a field of falling logo marks behind the banner greeting (see `documentation/floating-logos-banner.md`)
- `LogoFallbackDirective` (`src/app/directives/logo-fallback/`) generates a data-URI SVG placeholder — the organization's name as themed accent-colored text — for work/education entries with no logo image
- All page copy (nav, banner, about, education, work history, contact, footer socials) is data-driven from `src/assets/config.json`, read through a single `SiteConfigService` (see `documentation/config-dedup-refactor.md`)

**Analytics**
- Google Analytics 4 via the global `gtag.js` site tag, loaded inline in `src/index.html`; `AnalyticsService` calls the global `gtag()` directly — no analytics npm package is used (an earlier `ngx-google-analytics` integration was removed since it was never wired up) — see `documentation/google-analytics.md`

**Infrastructure & deployment**
- **Hosting/build**: [Vercel](https://vercel.com) builds and serves the production app (`vercel.json`); a `postbuild` step (`scripts/inject-env.js`) substitutes `%GOOGLE_ANALYTICS_ID%` in `index.html` from Vercel's environment at build time so the ID isn't hardcoded in source
- **DNS, CDN proxy & email**: [Cloudflare](https://www.cloudflare.com/) manages the `yannislam.org` zone — proxied `A`/`CNAME` records in front of Vercel, plus Cloudflare Email Routing (MX/SPF/DKIM/DMARC) for `@yannislam.org` mail
- Legacy/preview subdomains (`alpha.`, `v1.`, `v2.`) still resolve to Netlify via Cloudflare CNAMEs from earlier iterations of this site

## Architecture

```mermaid
flowchart TB
    subgraph Bootstrap
        Main["main.ts"] --> AppModule
        AppModule --> AppComponent
    end

    subgraph "AppComponent shell"
        AppComponent --> LoadingScreen["LoadingScreenComponent<br/>(anime.js logo intro)"]
        AppComponent --> Header["HeaderComponent<br/>(nav + theme toggle)"]
        AppComponent --> Outlet{{"router-outlet"}}
        AppComponent --> Footer["FooterComponent"]
    end

    Outlet -->|"path: ''"| Home["HomeComponent"]
    Outlet -->|"path: 'aardeyamz'<br/>loadComponent (lazy chunk)"| AardeYamz["AardeYamzComponent<br/>+ NamecardComponent"]

    subgraph "HomeModule (eager)"
        Home --> Banner["BannerComponent"]
        Banner --> FloatingLogos["FloatingLogosComponent<br/>(falling logo field)"]
        Home --> About["AboutComponent"]
        Home --> Education["EducationComponent"]
        Home --> WorkHistory["WorkHistoryComponent x2<br/>(work / volunteering)<br/>logoFallback directive"]
        Home --> Contact["ContactComponent"]
    end

    Config[("src/assets/config.json")] --> SiteConfigService
    SiteConfigService --> Header
    SiteConfigService --> Footer
    SiteConfigService --> Banner
    SiteConfigService --> Home
    SiteConfigService --> Education
    SiteConfigService --> AardeYamz

    ThemeService["ThemeService<br/>(signals, localStorage)"] --> Header
    ThemeService --> LoadingScreen
    ThemeService -->|"recolor on toggle"| FloatingLogos
    ThemeService -->|"accent color"| WorkHistory

    AnalyticsService --> Header
    AnalyticsService --> Banner
    AnalyticsService --> About
    AnalyticsService --> Footer
    AnalyticsService --> Contact
    AnalyticsService -->|"gtag events/pageviews"| GA[("Google Analytics")]
```

### Deployment & DNS

```mermaid
flowchart LR
    Dev["git push"] --> GitHub["GitHub repo"]
    GitHub -->|"build hook"| Vercel["Vercel<br/>ng build + postbuild inject-env.js"]

    Visitor["Visitor's browser"] -->|"DNS lookup"| Cloudflare["Cloudflare<br/>DNS zone: yannislam.org"]
    Cloudflare -->|"proxied A / CNAME"| Vercel
    Vercel -->|"static Angular bundle"| Visitor

    Cloudflare -->|"MX / SPF / DKIM / DMARC<br/>Email Routing"| Inbox["email@yannislam.org"]
    Cloudflare -.->|"legacy CNAMEs<br/>(alpha., v1., v2.)"| Netlify["Netlify<br/>(older site versions)"]
```

### GitHub Actions & CI/CD Pipeline

```mermaid
flowchart LR
    PR["Pull Request<br/>to main/master/develop"] -->|"triggers"| GHA["GitHub Actions<br/>Build & Test"]
    
    subgraph "Matrix Strategy"
        N22["Node.js 22.x"] 
        N24["Node.js 24.x"]
    end
    
    GHA --> N22
    GHA --> N24
    
    N22 --> Checkout["Checkout code"]
    N24 --> Checkout
    
    Checkout --> Setup["Set up Node.js<br/>+ npm cache"]
    Setup --> AngularCache["Cache Angular<br/>build artifacts"]
    AngularCache --> Install["npm ci<br/>(install dependencies)"]
    
    Install --> Tests["npm test<br/>(with coverage)"]
    Tests --> Coverage["Upload coverage<br/>to Codecov"]
    
    Coverage --> Build["npm run build<br/>(Angular AOT)"]
    Build --> Verify["Verify dist/<br/>artifacts"]
    
    Verify -->|"All pass"| Success["✅ PR approved<br/>for merge"]
    Verify -->|"Any fail"| Failure["❌ PR blocked<br/>until fixed"]
    
    Success --> Merge["Merge to base<br/>branch"]
    Merge --> VercelBuild["Vercel deploys<br/>production"]
```

#### Workflow: `build-test.yml`

The project's primary CI/CD pipeline runs automatically on every pull request to `main`, `master`, or `develop`:

- **Trigger**: PR opened or updated against protected branches
- **Matrix Strategy**: Tests run against Node.js 22.x and 24.x to ensure compatibility across LTS and current versions
- **Steps**:
  1. **Checkout** — fetches the PR branch
  2. **Node.js Setup** — installs the specified Node version with npm cache restoration for faster builds
  3. **Angular Cache** — restores `.angular/cache` from previous runs to speed up compilation
  4. **Install** — runs `npm ci` for deterministic dependency installation
  5. **Tests** — runs headless Chrome unit tests with code coverage (`karma`, `jasmine`)
  6. **Coverage** — uploads test coverage reports to [Codecov](https://codecov.io) for coverage tracking
  7. **Build** — compiles the Angular app with ahead-of-time (AOT) compilation
  8. **Verify** — ensures the `dist/` directory was created and reports bundle size

All steps must pass for the PR to be mergeable; any failure blocks the merge and requires a code fix + push to re-run.

## Code Structure

```
.github/
├── workflows/
│   └── build-test.yml        # CI/CD pipeline: runs tests, coverage, and builds on PRs
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
`config.json` directly — see `documentation/config-dedup-refactor.md` for why.
Other write-ups worth skimming when touching a specific area live in
`documentation/` (loading screen animation, Google Analytics wiring, the
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

**Current Test Suite Statistics (as of 2026-08-01):**
- **Total Tests**: 118
- **Passing**: 118 (100%) ✅
- **Failing**: 0

**Test Files Created**:
- `src/app/components/general/loading-screen/loading-screen.component.spec.ts` ✅
- `src/app/components/home/floating-logos/floating-logos.component.spec.ts` ✅
- `src/app/components/home/projects/projects.component.spec.ts` ✅
- `src/app/components/home/projects-highschool/projects-highschool.component.spec.ts` ✅

### Known Test Issues

Some tests fail due to incomplete dependency setup (child components, router modules, etc.):
1. **Component Template Errors**: Missing nested component declarations
2. **Standalone Component Injectors**: Need provider configuration for `ActivatedRoute` and routing modules
3. **Third-party Module Exports**: Missing `NgbNav` and other ng-bootstrap exports

These are not code bugs but rather test setup improvements that can be addressed by:
- Adding missing imports to component test modules
- Providing mock or real implementations of injected services
- Configuring proper test bed setup for standalone components

For details on test status, see [`DEPLOYMENT_STATUS.md`](DEPLOYMENT_STATUS.md).
