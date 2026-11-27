# Yannis Lam Portfolio Website v.3

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-24%20%7C%2026-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Build & Test](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml)
[![CI](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/ci.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/ci.yml)
[![Dependabot](https://img.shields.io/badge/dependencies-Dependabot-025E8C?logo=dependabot&logoColor=white)](.github/dependabot.yml)
[![Playwright](https://img.shields.io/badge/E2E-Playwright%201.65-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![DNS & Email by Cloudflare](https://img.shields.io/badge/DNS%20%26%20Email-Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Google Analytics](https://img.shields.io/badge/Analytics-Google%20Analytics-E37400?logo=googleanalytics&logoColor=white)](https://analytics.google.com/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-yellow.svg)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Content-CC%20BY%204.0-lightgrey.svg)](LICENSE-CONTENT)

The source of [yannislam.org](https://yannislam.org): a public Angular 22 portfolio, prerendered to static HTML and served from Vercel. Nearly all page copy lives in `src/assets/config.json`. Forked from [Lê Thanh Tuấn's Portfolio](https://github.com/lethanhtuan939/Portfolio), based on [José Hernández's](https://github.com/andresjosehr/andresjosehr-portfolio), adapted from [Brittany Chiang's](https://github.com/bchiang7/v4).

## Architecture

```mermaid
flowchart LR
    subgraph repo["v3.yannislam.org"]
        cfg["src/assets/config.json"]
        app["src/app/<br/>Angular components"]
        pin["theme.json<br/>pinned, hash-checked"]
    end
    theme["yl-theme"] -. "tokens, logos" .-> pin
    pin --> build["npm run build<br/>prerender"]
    cfg --> build
    app --> build
    ci["GitHub Actions<br/>Build & Test, CI"] --> build
    build --> vercel["Vercel"]
    dns["personal-dns<br/>Cloudflare"] -. "DNS" .-> vercel
    vercel --> site["yannislam.org"]
    ci --> previews["PR previews<br/>v3.yannislam.org/pr-N/"]
```

The full picture is in [`docs/diagrams/architecture.svg`](docs/diagrams/architecture.svg) (source: [`architecture.d2`](docs/diagrams/architecture.d2)).

- **App:** standalone components, signals, zoneless, `@angular/ssr` prerendering. Routes: `/`, `/projects`, `/projects/highschool`, `/aardeyamz`; keep `app.routes.ts` and `app.routes.server.ts` in step. Components read content only through `SiteConfigService`.
- **Build hooks:** before start, build, watch, test and e2e, `generate-resume-manifest.js` links the newest dated resume PDF and `fetch-theme.js` downloads the theme files pinned in `theme.json` from `theme.yannislam.org`. After build, `inject-env.js` fills in `GOOGLE_ANALYTICS_ID` (required on Vercel; `ALLOW_MISSING_ANALYTICS=1` lets a fork skip it).
- **Content:** edit `config.json`, typed by `site-config.model.ts`; nothing validates it at build time.
- **Deploy:** Vercel builds `main` for production and every branch as a preview (`vercel.json` sets the security headers); each production deploy is tagged and released. `vercel-build-warnings.yml` needs `VERCEL_TOKEN`.
- **Dependencies:** weekly Dependabot bumps with auto-merge for patch, minor and dev majors; Aikido triages advisories. Angular majors are upgraded by hand with `ng update`.

## Layout

```
src/
  app/            components/, directives/, icons/, pipes/, services/
  assets/         config.json, fonts, images, resume PDFs
  generated/      fetched theme files (git-ignored)
e2e/              Playwright specs and fixtures
scripts/          build hooks and their tests
docs/             change write-ups, plans, reviews, diagrams
wiki/             GitHub wiki pages (published from here)
.github/          CI, preview, release and Dependabot config
```

## Related repos

| Repo | Role |
|---|---|
| [yl-theme](https://github.com/AardeYamz/yl-theme) (private) | color tokens, logos and favicons |
| [workflows](https://github.com/AardeYamz/workflows) | shared CI workflows and diagram linters |
| [personal-dns](https://github.com/AardeYamz/personal-dns) (private) | Cloudflare DNS and email routing |
| [yannislam.org](https://github.com/AardeYamz/yannislam.org) (private) | the earlier Gatsby site |

## Getting started

You need Node.js 24 or 26 (CI runs both).

```bash
npm install
npm start            # dev server at http://localhost:4200, reloads on save
npm run build        # prerender every route
```

The first `start` downloads the theme files, so `theme.yannislam.org` must be reachable. A local build without `GOOGLE_ANALYTICS_ID` warns and uses a placeholder. More in [Getting Started](wiki/Getting-Started.md).

## Testing

```bash
npx playwright install --with-deps chromium firefox webkit   # once per machine
npm test -- --no-watch   # Vitest unit tests, one run (plain npm test watches)
npm run test:scripts     # tests for the build scripts
npm run test:e2e         # Playwright; test:e2e:ui for interactive mode
npm run test:perf        # Lighthouse CI; test:perf:desktop for desktop
```

Unit tests stub child components, so page composition, navigation and theming are covered by the Playwright specs in `e2e/`. In new specs, wait with `gotoAndSettle()` from `e2e/fixtures.ts`, not `waitForTimeout()`. More in [Testing](wiki/Testing.md).

## Docs

- [Wiki](https://github.com/AardeYamz/v3.yannislam.org/wiki) (source in [`wiki/`](wiki/)): architecture and component diagrams, `config.json`, testing, CI/CD schedule and DNS.
- [docs/README.md](docs/README.md): index of change write-ups, plans and reviews.
- [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md): conventions and rules.
- [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Code is [MIT](LICENSE); content is [CC BY 4.0](LICENSE-CONTENT).
