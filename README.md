# Yannis Lam Portfolio Website v.3

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Build & Test](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/build-test.yml)
[![Security](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/security.yml/badge.svg)](https://github.com/AardeYamz/v3.yannislam.org/actions/workflows/security.yml)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/Code-MIT-yellow.svg)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Content-CC%20BY%204.0-lightgrey.svg)](LICENSE-CONTENT)

The source of [yannislam.org](https://yannislam.org): an Angular 22 portfolio site, prerendered to static HTML and served from Vercel. Nearly all page copy lives in one file, `src/assets/config.json`.

Lineage: forked from [Lê Thanh Tuấn's Portfolio](https://github.com/lethanhtuan939/Portfolio), based on [José Hernández's](https://github.com/andresjosehr/andresjosehr-portfolio), adapted from [Brittany Chiang's](https://github.com/bchiang7/v4).

## Architecture

Standalone components, signals and zoneless change detection; every route is prerendered by `@angular/ssr`. Routes: `/` (eager), `/projects` and `/projects/highschool`, `/aardeyamz` (lazy). Config comes from `config.json` through `SiteConfigService`; the theme comes from the [yl-theme](https://github.com/AardeYamz/yl-theme) repo, fetched at the pinned version in `theme.json`.

Full architecture, code structure and build hooks: [docs/reference.md](docs/reference.md#architecture).

```mermaid
flowchart TB
    Main["main.ts + app.config.ts"] --> App["AppComponent"]
    subgraph Shell["App shell"]
        Header
        Outlet{{"router-outlet"}}
        Footer
    end
    App --> Header & Outlet & Footer
    Outlet -->|"eager"| Home
    Outlet -->|"lazy"| Projects & AardeYamz
    Config[("config.json")] --> SiteConfig["SiteConfigService"] --> Shell
    Pin[("theme.json<br/>version + SHA-256")] --> Fetch["scripts/fetch-theme.js"]
    ThemeHost["theme.yannislam.org<br/>yl-theme"] --> Fetch
    Fetch --> Tokens[("src/generated/yl-tokens.css")] --> Shell
```

```mermaid
flowchart LR
    PR["Pull request or push to main"] --> CI["Build and Test<br/>unit, build, lighthouse, e2e"]
    PR --> Sec["Security"]
    CI & Sec --> Gate{"All green?"}
    Gate -->|"yes"| Merge["Merge to main"]
    Merge --> Vercel["Vercel build + deploy"] --> Edge["yannislam.org"]
    Visitor["Visitor"] --> CF["Cloudflare DNS + Email"] --> Edge
```

## Related repos

| Repo | Relationship |
|---|---|
| [yl-theme](https://github.com/AardeYamz/yl-theme) | Supplies `yl-tokens.css` and the logos, pinned in `theme.json` |
| [personal-dns](https://github.com/AardeYamz/personal-dns) | DNS, redirects and email routing for `yannislam.org` |
| [workflows](https://github.com/AardeYamz/workflows) | Shared CI: diagram lint, zizmor, PR sync, Dependabot auto-merge |
| [yannislam.org](https://github.com/AardeYamz/yannislam.org), [v3.yannislam.org-gatsby](https://github.com/AardeYamz/v3.yannislam.org-gatsby) | Earlier versions of the site |

## Getting started

Node.js 24 or 26 (CI runs both).

```bash
npm install
npm start            # dev server at http://localhost:4200
npm run build        # prerender every route + postbuild env substitution
npm test             # Vitest unit tests
npm run test:e2e     # Playwright
npm run test:perf    # Lighthouse CI
```

`npm run build` fills in the Google Analytics ID from `GOOGLE_ANALYTICS_ID`; locally it uses an inert placeholder and warns.

## More

| Doc | What |
|---|---|
| [docs/reference.md](docs/reference.md) | Stack, routes, code structure, build hooks, testing, CI/CD, DNS, dependency security |
| [docs/README.md](docs/README.md) | Index of change write-ups, plans and reviews |
| [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) | Conventions for agents and people changing the code |
| [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) | Contributing and reporting vulnerabilities |
