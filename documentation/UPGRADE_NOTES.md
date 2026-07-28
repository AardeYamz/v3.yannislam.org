# 2026 Dependency Upgrade Summary

This document summarizes the work done on the `feature-2026-update` branch/worktree: updating Node.js, Angular, and all other project dependencies to their latest versions, and why each change was made.

## 1. Node.js: v22.12.0 → v24.18.0 (LTS)

Angular 22 requires Node.js ≥22.22.3 (or ≥24.15/≥26). The machine only had v22.12.0 installed, with no nvm/fnm/volta available to manage multiple versions locally. Per your request, Node.js 24 LTS was installed system-wide via `winget install OpenJS.NodeJS.LTS`.

**Note:** this changes the Node version globally on this machine, not just for this project — it will affect any other Node projects run here.

## 2. Angular: v19.0.5 → v22.0.8

Angular doesn't support skipping major versions in one jump, so the upgrade was done sequentially, running `ng update` (and its automated migration schematics) at each step:

- **19 → 20**: workspace/tsconfig defaults updated (`moduleResolution: bundler`), unused default karma config removed.
- **20 → 21**: `tsconfig` `lib` bumped to `es2022`; deprecated bootstrap options in `main.ts` migrated to providers; entire app template syntax converted to the new block control-flow syntax (`@if`/`@for` instead of `*ngIf`/`*ngFor`) across 8 component templates.
- **21 → 22**: `ChangeDetectionStrategy.Eager` added to all components (new explicit default); `istanbul-lib-instrument` added as a dev dependency (now required for Karma coverage); optional-chaining expressions in templates wrapped for the new safe-navigation migration; various tsconfig diagnostic flags adjusted.

Third-party libraries pinned to Angular 19 were incompatible with 20/21, so intermediate steps were forced (`--force`) past their peer-dependency warnings, then corrected in one pass afterward (see §3).

## 3. Other dependencies bumped to latest

| Package | Before | After | Why |
|---|---|---|---|
| `@ng-bootstrap/ng-bootstrap` | 18.0.0 | 21.0.0 | Matches Angular 22 (ng-bootstrap majors trail Angular by 1) |
| `ngx-owl-carousel-o` | 19.0.0 | 22.0.0 | Matches Angular 22 |
| `@fortawesome/fontawesome-free` | 6.7.2 | 7.3.1 | Latest major |
| `bootstrap` | 5.3.3 | 5.3.8 | Latest patch |
| `rxjs` | 7.8.0 | 7.8.2 | Latest patch |
| `tslib` | 2.3.0 | 2.8.1 | Latest minor |
| `zone.js` | 0.15.0 | 0.16.2 | Latest minor (still required — app uses `provideZoneChangeDetection`, not zoneless) |
| `typescript` | 5.6.3 | 6.0.3 | Pulled in automatically by `ng update` for Angular 22 compat |
| `@types/aos`, `@types/jasmine`, `jasmine-core`, `karma`, `karma-coverage`, `karma-jasmine-html-reporter` | various | latest | Dev/test tooling kept in step with the Angular 22 toolchain |
| `ngx-typed-js`, `ngx-google-analytics` | 2.1.1 / 14.0.1 | unchanged | Already at latest published version |

`zone.js` had silently dropped out of `package.json` during the `ng update` run even though `angular.json` still references it as a polyfill — it was added back explicitly so the build doesn't rely on a transitive install.

## 4. Fixes required to get a clean build

The upgrade surfaced a few pre-existing issues that only became build/type errors under the newer, stricter TypeScript/Angular compiler:

- **`tsconfig.json`**: `baseUrl` triggered a TS 6.0 deprecation error (`TS5101`). It's still needed (the app imports modules like `src/app/services/analytics/analytics.service` using `baseUrl`-relative paths, not relative `../` paths), so instead of removing it, `"ignoreDeprecations": "6.0"` was added to silence the warning without breaking module resolution.
- **`header.component.ts`**: `@HostListener('window:scroll', ['getScrollPosition($event)'])` was malformed — the args array should list event parameter names (e.g. `'$event'`), not a call expression. The method (`getScrollPosition()`) takes no parameters and doesn't use `$event` (it reads `window.scrollY` directly), so the listener was simplified to `@HostListener('window:scroll')`. TS 6's stricter argument-count checking turned this from a silently-ignored mistake into a hard build error (`TS2554`).
- **`app.component.spec.ts`**: contained two stale assertions left over from the default `ng new` scaffold — checking for an `app.title` property and rendered text (`'... app is running!'`) that have never existed on the real `AppComponent`/template (which just renders `<app-header>`, `<router-outlet>`, `<app-footer>`). These were pre-existing dead assertions (not caused by the dependency bump) but were failing the test run, so they were removed, leaving the one meaningful test (`should create the app`).

## 5. Verification

- `ng build` — passes cleanly (one pre-existing, non-blocking warning: `aos` is shipped as CommonJS, not ESM).
- `ng test` — 5 of 12 pass. The other 7 failures are **pre-existing** and unrelated to this upgrade: their spec files (e.g. `header.component.spec.ts`, `home.component.spec.ts`) only declare the component in isolation in `TestBed`, without importing the modules/directives it actually depends on (`NgbNavModule`, `RouterModule`, `AppModule`, etc.). None of those spec files were touched by any `ng update` migration or by this work — confirmed via `git diff --stat -- '*.spec.ts'`, which shows only `app.component.spec.ts` changed. Fixing them is a separate, pre-existing test-infrastructure gap, out of scope for a dependency update.

## 6. README

Updated the "Stack" section, which was stale (listed `animejs`, which isn't actually a dependency, and Angular CLI 19) to reflect what's actually used: Node 24 LTS, Angular CLI 22, ng-bootstrap 21, bootstrap 5, fontawesome 7, aos, ngx-typed-js, ngx-owl-carousel-o, ngx-google-analytics, netlify.

## Not done / left as-is

- The 7 pre-existing failing unit tests (see §5) were not fixed — flagging for a separate task if you want proper `TestBed` setups for those components.
- Nothing has been committed; all changes are sitting in this worktree for review.
