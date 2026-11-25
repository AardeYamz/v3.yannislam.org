# Getting Started

You need [Node.js](https://nodejs.org/) 24 or 26 (CI runs both). The Angular CLI is a dev dependency, so `npx ng …` works without a global install.

```bash
npm install
npm start            # dev server at http://localhost:4200, reloads on save
npm run build        # production build: prerender every route + postbuild env substitution
npm test             # Vitest unit tests (watch mode)
npm run test:e2e     # Playwright end-to-end tests
npm run test:perf    # Lighthouse CI (mobile; test:perf:desktop for desktop)
```

`npm run build` fills in the Google Analytics ID from the `GOOGLE_ANALYTICS_ID` environment variable. Locally it falls back to an inert placeholder (`G-XXXXXXXXXX`) and warns.

Verify a change with `npm test`, `npm run build` and `npm run test:e2e`.

## Stack

**Framework:** Angular 22 (standalone components, signals, zoneless change detection, client hydration, service worker), `@angular/ssr` prerendering every route, TypeScript 6 in strict mode.

**UI:** Bootstrap 5 and ng-bootstrap, Material Design 3 colour roles from the shared yl-theme tokens, inline SVG icons, ngx-owl-carousel-o, anime.js 4 for the boot-time logo animation. Hand-written: typewriter banner, falling-logo loop, `AosDirective` scroll reveal, hover link previews, `LogoFallbackDirective`.

**Analytics:** Google Analytics 4 via `gtag.js` (custom events only, from `AnalyticsService`), plus Vercel Web Analytics and Speed Insights.

**Hosting:** Vercel builds and serves the site (`vercel.json` also sets security headers, including a report-only CSP). Cloudflare holds the `yannislam.org` DNS zone and handles email routing.
