# CLAUDE.md

Guidance for Claude Code (claude.ai/code) and anyone else changing this repo.
[`README.md`](README.md) covers the stack, architecture, `config.json` keys,
tests and CI in full; this file keeps the rules and the things that are easy
to get wrong.

## Commands

```bash
npm install
npm start                    # dev server at http://localhost:4200
npm run build                # prerender every route + postbuild env substitution
npm test                     # Karma + Jasmine, watch mode
npm test -- --watch=false --browsers=ChromeHeadless   # single run, as CI does
ng test --include='**/component-name.component.spec.ts'
npm run test:e2e             # Playwright
npm run test:perf            # Lighthouse CI
```

Verify a change with `npm test`, `npm run build` and `npm run test:e2e`.

## The app in brief

An Angular 22 portfolio site: standalone components, signals, zoneless change
detection, prerendered to static HTML (`@angular/ssr`) and served by Vercel,
with Cloudflare in front for DNS and email.

- **Bootstrap:** `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`;
  providers in `src/app/app.config.ts` (server: `app.config.server.ts`).
- **Routes:** `src/app/app.routes.ts` (`''` eager; `projects`,
  `projects/highschool`, `aardeyamz` lazy via `loadComponent`; `**` redirects
  to `/`). `src/app/app.routes.server.ts` lists the same paths for
  prerendering; keep the two in step.
- **Content:** all page copy is in `src/assets/config.json`, read only through
  `SiteConfigService` and typed by `site-config.model.ts`.
- **Services:** `SiteConfigService`, `ThemeService` (`default`/`light`/`dark`
  as signals, `localStorage`, `[data-theme]` on `<html>`), `AnalyticsService`
  (custom `gtag()` events only; GA4 enhanced measurement tracks page views),
  `ResumeService`.
- **Directives:** `AosDirective` (scroll reveal), `LogoFallbackDirective`
  (placeholder logo from the organization's name), `link-preview` (hover
  previews).
- **Icons:** inline SVGs in `src/app/icons/icon-registry.ts`, keyed by Font
  Awesome names (`fa-linkedin`) and rendered by `<app-icon>`. Font Awesome
  itself is not a dependency; add a glyph to the registry to use a new icon.

## Rules

### Content and components

- Never import `config.json` in a component; inject `SiteConfigService`.
- `config.json` has no runtime validation. Keep new entries in the same shape
  as their neighbours and update `site-config.model.ts` with any new field.
- Components follow the Angular trio (`.ts` / `.html` / `.scss`, plus
  `.spec.ts`) under `src/app/components/{general,home,other}/`.
- To add a home section: create the component under `components/home/`, add
  its data to `config.json`, read it through `SiteConfigService`, add it to
  `HomeComponent`'s template, optionally reveal it with `appAos`.
- A new route goes in both `app.routes.ts` and `app.routes.server.ts`.

### SSR, zoneless and hydration

- Every route is prerendered. Keep browser APIs (`window`, `document`,
  `IntersectionObserver`, `Image`, `matchMedia`) behind `isPlatformBrowser`.
- With zoneless change detection, state written outside a template event
  (scroll listeners, observers, rAF, third-party callbacks) must be a signal
  or be followed by `markForCheck()`.
- Read the comments in `app.component.ts`, `loading-screen.component.ts` and
  `utils/hydration.ts` before touching the loading screen or `headerReady`.
  They record bugs that were fixed once already.
- The long comments in the code explain why it works the way it does. Keep
  them, and update them when you change the behavior they describe.

### Styling

- Color tokens are not in this repo: they come from the shared theme project
  (https://github.com/AardeYamz/yl-theme). `scripts/fetch-theme.js` (run by the
  pre* hooks) downloads `yl-tokens.css` from https://theme.yannislam.org at the
  version pinned in `theme.json`, checks its SHA-256, and writes
  `src/generated/yl-tokens.css` (git-ignored), which `angular.json` loads. It
  holds the site's `--color-*` palette and Material Design 3 `--md-sys-color-*`
  tokens, set per mode under `:root[data-theme="light"]` and
  `:root[data-theme="dark"]` (the default mode is the base `:root`). Reference
  them with `var(...)` so every theme works. To change a token, change it in
  yl-theme (CI there cuts a new timestamped version), then here run
  `node scripts/fetch-theme.js --bump`, rebuild, and commit `theme.json`.
  `ThemeService`'s `NAVY_BY_MODE` / `ORANGE_BY_MODE` mirror two tokens as
  literals; a unit test fails if a bump moves them.
- `src/styles.scss` holds global styles, `src/bootstrap-custom.scss` the
  Bootstrap overrides, `src/fonts.scss` the `@font-face` rules. Component
  styles stay in the component's SCSS.

### Build hooks

- `scripts/generate-resume-manifest.js` runs before `start`, `build`, `watch`
  and `test`. It writes the newest `src/assets/resume/<name> YYYYMMDD.pdf` to
  `src/assets/resume-manifest.json`. The manifest is tracked in git: commit it
  together with a new resume PDF.
- `scripts/inject-env.js` runs after `build` and replaces
  `%GOOGLE_ANALYTICS_ID%` in every built HTML file. On Vercel (`VERCEL=1`) a
  missing or malformed ID fails the build, because previews and production
  are both public. Elsewhere it writes the inert `G-XXXXXXXXXX` and warns.
  `ALLOW_MISSING_ANALYTICS=1` lets a fork opt out. **Never reintroduce a real
  measurement ID as a fallback.**

### Security headers

`vercel.json` sets the response headers, including a
`Content-Security-Policy-Report-Only`. A new third-party script, frame, image
host or connection must be added to that policy.

## Documentation

Docs live under `docs/`; [`docs/README.md`](docs/README.md) indexes them.

- **`docs/changes/`**: write-ups of work already done. Skim the ones for an
  area before changing it, and add one for any substantial change.
- **`docs/todo/`**: plans for work not yet built. [`docs/todo/README.md`](docs/todo/README.md)
  orders them; update it when a plan's status changes.
- **`docs/reviews/`**: point-in-time reviews of PRs (`pr-<number>-<slug>.md`)
  and audits (`<topic>-YYYY-MM-DD.md`).

When a change affects commands, architecture or conventions, update
`README.md` and this file in the same PR.

### Naming rule for `docs/changes/`

Each file is named `YYYYMMDD-HHMMSS-kebab-case-title.md` and starts with a
matching `Date:` header:

```
Date: 2026-08-11 01:39:39

# Title Of The Document
...
```

- The timestamp is when the file is finalized (UTC), not when the work
  started. Run `date -u "+%Y-%m-%d %H:%M:%S"` and `date -u "+%Y%m%d-%H%M%S"`
  once and use them for the header and the filename so they match.
- If another file already has that `YYYYMMDD-HHMMSS`, append `-1`, `-2`, …
  to the new file's slug, in order.
- Filenames are stable once committed. A follow-up to the same work is a new
  section appended to the existing file (see the "Fixed: …" sections of
  `20260811-013939-ssr-prerendering.md`), not a rename.
- The rule applies only to `docs/changes/`.

## Mermaid diagrams are linted

Every ```mermaid block in a tracked `*.md` file must parse. The linter lives in the `cloudflare-workers-devops` repo (`mermaid-lint/`) and `.github/workflows/mermaid-lint.yml` calls it as `AardeYamz/cloudflare-workers-devops/mermaid-lint@v1` on any Markdown change. After editing a diagram, run it from this repo before committing (it expects `cloudflare-workers-devops` cloned next to this repo; run `npm ci` there once):

```
npm ci --prefix ../cloudflare-workers-devops/mermaid-lint
node ../cloudflare-workers-devops/mermaid-lint/lint.mjs
```

It prints `file:line` and the parser's message for each broken block. Changes to the linter go in `cloudflare-workers-devops`, not here.
