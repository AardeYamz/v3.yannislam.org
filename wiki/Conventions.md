# Conventions

Rules for changing the code (from [CLAUDE.md](https://github.com/AardeYamz/v3.yannislam.org/blob/main/CLAUDE.md)). Small, focused changes are preferred; open an issue before a larger change or new feature ([CONTRIBUTING](https://github.com/AardeYamz/v3.yannislam.org/blob/main/CONTRIBUTING.md)).

## Content and components

- Never import `config.json` in a component; inject `SiteConfigService`. No user-visible text in templates: put it in the `ui` block of `config.json`.
- Keep new `config.json` entries in the shape of their neighbours and update `site-config.model.ts` for any new field.
- Components follow the Angular trio (`.ts` / `.html` / `.scss`, plus `.spec.ts`) under `src/app/components/{general,home,other}/`.
- **Add a home section:** create the component under `components/home/`, add its data to `config.json`, read it through `SiteConfigService`, add it to `HomeComponent`'s template, optionally reveal it with `appAos`.
- **Add a route:** in both `app.routes.ts` and `app.routes.server.ts`.

## SSR, zoneless and hydration

- Every route is prerendered. Keep browser APIs (`window`, `document`, `IntersectionObserver`, `Image`, `matchMedia`) behind `isPlatformBrowser`.
- With zoneless change detection, state written outside a template event (scroll listeners, observers, rAF, third-party callbacks) must be a signal or be followed by `markForCheck()`.
- Read the comments in `app.component.ts`, `loading-screen.component.ts` and `utils/hydration.ts` before touching the loading screen or `headerReady`; they record bugs fixed once already. Keep the long explanatory comments and update them with the behaviour.

## Styling

- Colour tokens and logos come from yl-theme (see [Architecture](Architecture#theme-tokens)); never edit them here. To change a logo or add a colour, change it in yl-theme.
- Never copy logo polygon coordinates into a component: import `logo-geometry.json`.
- Favicons are fetched too; there is no `src/favicon.ico`, so never add one.
- Reference tokens with `var(...)` (in SCSS through the `$Primary`, `$Surface`… aliases in `src/variables.scss`). Use only the role names; the old `--color-*` palette names and unused roles are deprecated. The one exception, `--color-card-overlay`, is v3's own, set in `src/styles.scss`.
- `ThemeService`'s `NAVY_BY_MODE` / `ORANGE_BY_MODE` mirror two tokens as literals; a unit test fails if a bump moves them.
- Global styles in `src/styles.scss`, Bootstrap overrides in `src/bootstrap-custom.scss`, `@font-face` in `src/fonts.scss`; component styles stay in the component's SCSS.

## Build hooks

See [Architecture](Architecture#build-hooks). **Never reintroduce a real Google Analytics measurement ID as a fallback.**

## Documentation

- `docs/changes/`: add a write-up for any substantial change. Name it `YYYYMMDD-HHMMSS-kebab-case-title.md` and start it with a matching `Date: YYYY-MM-DD HH:MM:SS` header.
- `docs/todo/`: update `docs/todo/README.md` when a plan's status changes.
- `docs/reviews/`: `pr-<number>-<slug>.md` for a PR, `<topic>-YYYY-MM-DD.md` for an audit.
- When a change affects commands, architecture or conventions, update `README.md` and `CLAUDE.md` in the same PR.
