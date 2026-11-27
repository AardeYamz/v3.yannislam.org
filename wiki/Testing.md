# Testing

## Unit tests (Vitest)

```bash
npm test                                             # watch mode
npm test -- --no-watch                               # single run, as CI does
npm test -- --no-watch --coverage                    # with coverage
ng test --include='**/header.component.spec.ts'      # one spec
```

Vitest runs in Playwright's Chromium (`npx playwright install chromium`). CI uploads coverage from the Node 24 leg to Codecov.

## Script tests

`npm run test:scripts` runs `node --test` over `scripts/*.test.js`.

## End-to-end tests (Playwright)

Unit tests stub child components, so page composition, boot sequence, navigation and theme switching are covered by Playwright specs in `e2e/` against the real app.

```bash
npx playwright install --with-deps chromium firefox webkit   # once per machine
npm run test:e2e            # headless
npm run test:e2e:ui         # interactive UI mode
npm run test:e2e:report     # last run's HTML report
```

Locally Playwright starts (or reuses) `ng serve`. In CI it serves the `build` job's `dist/v3.yannislam.org/browser` output through a static server with SPA fallback, as Vercel does.

| Spec | Covers |
|---|---|
| `smoke` | Boot sequence, `<title>`, no console errors or failed same-origin requests on any route |
| `home-sections` | Each home section renders the content from `config.json` |
| `navigation` | Scroll-to-section and route clicks, hard loads, the `**` redirect, back/forward |
| `theme` | The `default → light → dark` cycle, persistence, `prefers-color-scheme` |
| `projects`, `resume`, `footer-and-links`, `responsive`, `assets` | Project pages, résumé download, footer and external links (`@external`, weekly only), mobile layout, asset loading |

When adding a spec, never `waitForTimeout()` past the loading screen: use `gotoAndSettle()` from `e2e/fixtures.ts`, which waits for the header nav, blocks analytics requests and isolates the service worker.

## Performance (Lighthouse CI)

`npm run test:perf` (mobile, slow 4G, 4× CPU) and `npm run test:perf:desktop` run Lighthouse against a production build with the budgets in `lighthouserc.js`. CI runs both presets on every PR.
