# SSR scaffolding + static prerendering

## Context

The site was a pure client-rendered SPA — no `@angular/ssr` in
`package.json`/`angular.json`, `platformBrowser().bootstrapModule(...)` in
`main.ts`, one `dist/v3.yannislam.org/browser/index.html` shell shipped for
every route. Every route's content comes from `src/assets/config.json`,
statically imported at build time (`SiteConfigService`) — there's no
backend and no per-request data anywhere in the app.

Given that, the goal here is **static prerendering** of the four known
routes (`/`, `/projects`, `/projects/highschool`, `/aardeyamz`) — a build-time
step that bakes each route's real HTML into its own file — rather than
standing up a live Node SSR server that renders on every request. A live
server would be pure overhead for a site with no dynamic data.

## Approach

### Scaffolding

Ran `ng add @angular/ssr` to generate the SSR wiring. Two things about this
environment/repo made it not entirely mechanical:

1. **Node version.** The Angular CLI 22 shell script hard-requires Node
   `^22.22.3 || ^24.15.0 || >=26.0.0`; the sandbox this was built in has
   `v22.22.2` — one patch version short — with no other qualifying Node
   build available locally (`/opt/node20`, `/opt/node21`, `/opt/node22`, all
   below the floor). Worked around it by locally patching
   `node_modules/@angular/cli/src/utilities/node-version.js`'s two version
   checks to return `true` so `ng` would run. **This patch lives only in
   the local `node_modules` install and is not committed** (`node_modules`
   is gitignored) — it's purely an artifact of this build environment and
   doesn't affect the app. A real dev/CI machine on a qualifying Node
   version won't need it and should just confirm `ng add`/`ng build` run
   cleanly on their own Node install.
2. **Peer-dependency pin.** `ng add @angular/ssr` defaults to `@angular/ssr@latest`
   (`22.1.2` at the time of this change), but the project's `@angular/core`
   and friends are pinned to `22.0.8`. `@angular/platform-server` (a
   dependency SSR needs) declares **exact-version** peer deps on
   `@angular/core`/`@angular/common`/`@angular/compiler`/`@angular/platform-browser`,
   so letting npm resolve `@angular/ssr`/`@angular/platform-server` to
   `22.1.x` produced an `ERESOLVE` conflict against the `22.0.8` packages
   already in the tree. Fixed by explicitly installing
   `@angular/platform-server@22.0.8` first, then running
   `ng add @angular/ssr@22.0.8` (pinned to match) instead of taking the
   schematic's default `latest`.

What the schematic generated, NgModule-flavored (this app isn't on
standalone components):

- `src/main.server.ts` — re-exports `AppServerModule` as the server
  bootstrap entry point.
- `src/app/app.module.server.ts` — a thin `NgModule` wrapping `AppModule`
  with `provideServerRendering(withRoutes(serverRoutes))`.
- `src/app/app.routes.server.ts` — the **server route config** that drives
  prerendering (see below).
- `src/server.ts` — an Express server (`AngularNodeAppEngine`) that serves
  the prerendered static files and would render on-demand for anything not
  prerendered. Scaffolded by default but **not needed for this app** — see
  "Deployment implications" below.
- `angular.json` — the `build` target gained `"server": "src/main.server.ts"`,
  `"outputMode": "server"`, and `"ssr": { "entry": "src/server.ts" }`. In
  Angular 22's unified application builder there's no separate `prerender`
  architect target the way older Angular Universal setups had one — the
  existing `ng build` (already the project's `build` script) now also
  produces the server bundle and runs prerendering per `app.routes.server.ts`,
  in one pass.
- `tsconfig.app.json` — `src/main.server.ts` and `src/server.ts` added to
  `files`.
- `package.json` — added `@angular/platform-server`, `@angular/ssr`,
  `express`, `@types/express` as dependencies, and a
  `serve:ssr:v3.yannislam.org` script that runs the Node server directly
  (again, not part of this app's actual deployment path — see below). The
  schematic also downgraded `@types/node` from `^26.1.2` to `^20.17.19`;
  left as generated since it's a dev-only type-package version and nothing
  in the app depends on Node 26-specific types.

### Static route list

The schematic's default `app.routes.server.ts` was a single catch-all:

```ts
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Prerender }
];
```

That's functionally close to what's needed (it does resolve every route the
Angular router knows about and prerender it), but it's implicit — it relies
on the router's own route table rather than saying what actually gets
prerendered. Replaced it with an explicit list mirroring
`src/app/app-routing.module.ts`, keeping the wildcard only as a fallback:

```ts
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'projects', renderMode: RenderMode.Prerender },
  { path: 'projects/highschool', renderMode: RenderMode.Prerender },
  { path: 'aardeyamz', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

If a new route is ever added to `app-routing.module.ts` without a matching
entry here, it still gets caught (and still prerendered, not left to a live
server) by the `**` fallback — but the explicit list is what documents
intent and is what should be kept in sync going forward.

## Platform guards

Node has no `window`/`localStorage`/`document`/`IntersectionObserver`. Angular's
server renderer (`@angular/platform-server`) fills in `window`/`document`
via a bundled emulation library (Domino) so those two globals *exist*
during prerendering, but Domino only emulates DOM structure, not real
browser behavior — it has no layout engine and doesn't implement
`matchMedia`, `IntersectionObserver`, `getComputedStyle`,
`getBoundingClientRect`, `clientWidth`/`scrollHeight` (real values), etc.
`localStorage` isn't defined by it at all. Anything touching those throws
during the build's prerender pass and breaks it.

Every touch of these was gated behind Angular's `PLATFORM_ID` /
`isPlatformBrowser()` (not a `typeof window !== 'undefined'` check — see
`floating-logos.component.ts` below for why that's not sufficient here) so
the real logic only runs client-side and no-ops cleanly during
prerendering:

- **`src/app/services/theme/theme.service.ts`** — `localStorage` (initial
  mode read + `cycle()`'s persist) and `window.matchMedia` (initial mode +
  live OS-preference listener). Server-side, `resolveInitialMode()` returns
  a fixed `'default'` and `applyToDom()`/the `matchMedia` listener are
  skipped entirely.
- **`loading-screen.component.ts`** — drives the boot animation via
  `animejs`, plus direct `document.body.style.overflow` writes. On the
  server, `ngAfterViewInit()` now skips the whole intro/outro sequence and
  immediately sets `hidden = true` + emits `finished`, so the header (which
  `app.component.html` keeps out of the DOM until that event fires) still
  renders into the prerendered HTML instead of being permanently gated
  behind an animation that would never run on the server.
- **`header.component.ts`** — `@HostListener('window:scroll')` and the
  `logoRotationDeg` getter read `window.scrollY`/`window.innerHeight`/
  `document.documentElement.scrollHeight` to drive a scroll-linked logo
  spin. Guarded so `getScrollPosition()` no-ops and `logoRotationDeg`
  returns `0` server-side; `scroll()` (smooth-scroll nav, `document.getElementById`)
  is also guarded, though it's only ever reachable from a click handler
  and wouldn't fire during prerendering regardless.
- **`src/app/directives/aos/aos.directive.ts`** — `new IntersectionObserver(...)`
  for the scroll-reveal effect applied via `[data-aos]`, used broadly
  across the page templates. This one **would have broken the whole
  prerender build** (`IntersectionObserver` doesn't exist at all under
  Domino) had it not been guarded — skipped server-side; the element still
  renders with its real content, just without the animate-in state, and
  the browser wires up the real observer once it hydrates.
- **`floating-logos.component.ts`** (found via a broader grep for
  `window`/`document`/observer usage beyond the four files called out
  up-front, not itself in the original list) — already had `typeof window
  !== 'undefined'` guards in a couple of places, but that's not sufficient
  under Domino: **`window` itself is defined server-side**, so that check
  passes, and the guarded code then calls `window.matchMedia(...)` (not
  implemented) and, in `ngAfterViewInit()`, `layoutLanes()` →
  `getBoundingClientRect()` (also not implemented) *before* the
  `typeof window` check even ran. Replaced with a proper `PLATFORM_ID`-derived
  `isBrowser` flag set once in the constructor, and moved the prerender-unsafe
  calls (including `layoutLanes()`) behind it.
- **`banner.component.ts` / `.html`** — `<ngx-typed-js>` (wrapping the
  `typed.js` library) calls `getComputedStyle()` in its own `ngAfterViewInit()`,
  which isn't implemented under Domino and would throw during prerendering
  of the home route. This is third-party code, not something to patch
  in-repo, so instead of guarding internals, the component itself is
  conditionally rendered: `@if (isBrowser) { <ngx-typed-js>… } @else { <h3
  class="typing">{{ data.banner.typeSection[0] }}</h3> }` — the server gets
  a static first line of the rotating text (still real, indexable content),
  the browser gets the full animated version.

Also audited and confirmed **safe as-is**: `analytics.service.ts` (already
guards on `typeof gtag !== 'function'`, and `gtag` is only defined by an
inline `<script>` that doesn't run server-side); `resume.service.ts`'s
`window.open(...)` (only ever called from click handlers —
`downloadResume()`/`openResume()` — never from a lifecycle hook, so it's
not reachable during prerendering); `site-config.service.ts` (reads
`config.json` via a static `import`, resolved at build time on both server
and browser bundles — not a runtime fetch, nothing platform-specific);
`ngx-owl-carousel-o` (already ships its own internal `isPlatformBrowser`
guards as of the installed `22.0.6`, unlike `ngx-typed-js`).

## Files touched

- `angular.json`, `tsconfig.app.json`, `package.json`, `package-lock.json` —
  `ng add @angular/ssr` scaffolding.
- `src/main.server.ts`, `src/app/app.module.server.ts`,
  `src/app/app.routes.server.ts`, `src/server.ts` — new, SSR entry points +
  explicit prerender route list.
- `src/app/app.module.ts` — `ng add` wiring (no manual edits beyond what
  the schematic generated).
- `src/app/services/theme/theme.service.ts` — platform guards.
- `src/app/components/general/loading-screen/loading-screen.component.ts` —
  platform guard.
- `src/app/components/general/header/header.component.ts` — platform
  guards; `header.component.spec.ts` updated to pass a `'browser'`
  `PLATFORM_ID` since it constructs `HeaderComponent` directly with `new`
  rather than through `TestBed`.
- `src/app/directives/aos/aos.directive.ts` — platform guard.
- `src/app/components/home/floating-logos/floating-logos.component.ts` —
  replaced `typeof window` checks with a proper `PLATFORM_ID` guard.
- `src/app/components/home/banner/banner.component.ts` / `.html` —
  client-only `<ngx-typed-js>` with a static server-side fallback.

## Verification

Ran the project's existing `ng build` (production is the default
configuration, unchanged as a command — no new build script needed; it now
produces both the browser and server bundles and prerenders as part of the
same invocation):

```
Prerendered 4 static routes.
Application bundle generation complete. [~24s]
```

No TypeScript, template, or prerender-time errors. (One pre-existing,
unrelated warning: `header.component.scss` is 500 bytes over its
`anyComponentStyle` budget — not touched by this change, not a build
failure.)

Confirmed this is real prerendered content and not an empty shell by
inspecting the generated static output directly:

- All four routes produced their own `index.html` under
  `dist/v3.yannislam.org/browser/`: `index.html`, `projects/index.html`,
  `projects/highschool/index.html`, `aardeyamz/index.html` — each 60–200 KB,
  not the ~1 KB an empty `<app-root></app-root>` shell would be.
- Each contains `ng-server-context="ssg"` on `<app-root>`, confirming it
  came from the static-prerender path (not client hydration output).
- The home route's HTML contains the actual banner copy (`"I am a Full
  Stack Software Developer"`, the first `typeSection` string — the
  server-side fallback described above), and `app-header` markup is
  present and populated (confirming the loading-screen guard correctly
  lets the header render server-side instead of staying hidden forever).
- `grep -c "{{"` across all four files returned `0` — no unresolved
  Angular template bindings leaked into the output.
- `<title>Yannis Lam</title>` present and correct on all four.

**Not verified** (flagging honestly per the task's risk level):

- **No headless browser was available in this build sandbox**
  (no `chromium`/`google-chrome` binary), so the existing Karma/Jasmine
  unit test suite (`ng test`) was not run. `header.component.spec.ts` was
  updated for the new constructor param since it's visibly incompatible
  otherwise; other specs use `TestBed` (which provides a default
  `PLATFORM_ID` of `'browser'` automatically) so shouldn't need changes,
  but that's inferred from reading them, not confirmed by an actual test
  run.
- **Hydration in a real browser was not checked.** The build/prerender
  output looks correct statically, but whether the client bootstraps
  cleanly on top of the prerendered DOM (no hydration mismatches/console
  errors) was not tested in an actual browser — this repo doesn't yet call
  `provideClientHydration()` explicitly (the `ngh="..."` attributes present
  in the output suggest the schematic's default wiring includes it, but
  this wasn't independently confirmed by loading the page).
- **`ngx-owl-carousel-o`'s SSR-safety** was verified by reading its
  bundled source (it calls `isPlatformBrowser` internally at the relevant
  lifecycle points), not by exercising a page that renders it during an
  actual prerender pass with carousel content loaded — the `ng build`
  above did complete without erroring on any page that uses it, which is
  reassuring but is not the same as inspecting that page's specific
  rendered output.

## Deployment implications — read before merging/deploying

**This is not a drop-in replacement for the current static hosting setup
without a follow-up look.** What changed on disk:

- Before: `ng build` produced one `dist/v3.yannislam.org/browser/index.html`
  (plus assets) — a single shell served for every URL, with routing
  handled entirely client-side.
- After: `ng build` produces `dist/v3.yannislam.org/browser/` (now with
  **one real, populated `index.html` per known route**, in matching
  subfolders) *and* a separate `dist/v3.yannislam.org/server/` (a Node/Express
  bundle, `server.mjs`, runnable via the new `serve:ssr:v3.yannislam.org`
  script).

The repo's `vercel.json` currently points `outputDirectory` at
`dist/v3.yannislam.org/browser` with no `framework` field set and no
`rewrites` — meaning navigating directly to (e.g.) `/projects` before this
change relied on Vercel auto-detecting this as an Angular app and applying
its default SPA fallback (rewrite unmatched paths to the single
`index.html`) so the client router could take over. Two things are worth a
deliberate check before relying on this in production, neither of which
was verified here (no Vercel deploy was performed as part of this task):

1. **Known routes now resolve to their own real prerendered file** (an
   improvement — `/projects` serves actual project content directly
   instead of the SPA shell), *if* Vercel's static/clean-URL serving picks
   up `projects/index.html` for a request to `/projects` the way it does
   for other static builds. This should be checked against an actual
   deploy, not assumed.
2. **Unknown/unlisted paths** still need *something* to fall back to
   (currently the client router's own `path: '**', redirectTo: '/'`) —
   confirm Vercel's zero-config Angular detection still applies that
   fallback given the presence of `@angular/ssr`, `server.ts`, and
   `outputMode: "server"` now in the project. It's also possible Vercel's
   framework auto-detection starts treating this as an SSR app and tries
   to deploy `server.mjs` as a serverless function instead of / in
   addition to serving `browser/` statically — which the current
   `buildCommand`/`outputDirectory`-only `vercel.json` doesn't account for
   either way.

The generated Node server (`src/server.ts`, `serve:ssr:v3.yannislam.org`)
is **not needed for deployment** given the static-prerendering approach
here — every route this app has is fully prerendered, so there's no
per-request rendering left to serve. It's left in place (that's what the
schematic scaffolds, and removing it isn't necessary for correctness) but
should be treated as inert unless a future route genuinely needs
per-request server rendering.

## Merge with main (post-review update)

This branch was rebased against `main` after several sibling optimization
PRs landed (font/CSS trimming, lazy routes + `OnPush`, the service worker,
Vercel Analytics). Conflicts were limited to `package.json`/
`package-lock.json` (both sets of new dependencies kept, lockfile
regenerated via `npm install`), `app.module.ts` (both
`provideClientHydration()` and `ServiceWorkerModule.register(...)`
retained), and `loading-screen`/`floating-logos` components, where both
this PR's `PLATFORM_ID`/`isPlatformBrowser` guards and the `OnPush` PR's
`ChangeDetectorRef`/`markForCheck()` additions needed to coexist in the
same constructors — both are now present in both files.

`ng build` after the merge still succeeds (exit 0, all 4 routes
prerendered, content verified non-empty), but it now surfaces 3
non-fatal `ReferenceError: Image is not defined` errors logged during
prerendering — one per route that renders the work-history carousel
(`/`, `/projects`, `/projects/highschool`). This traces to
`ngx-owl-carousel-o`'s lazy-image handling, which calls `new Image()` to
probe image dimensions; Domino (Angular's server-side DOM emulation)
doesn't implement the `Image` constructor. The exception is caught by
Angular's zone/error handling and doesn't stop the build or corrupt the
output — the carousel markup (`.owl-carousel`, `.img-feature-workhistory`)
is confirmed present in the rendered HTML for both affected routes — but
it's a real, previously-unverified gap in `ngx-owl-carousel-o`'s SSR
compatibility (this PR's original verification only read the library's
source for `isPlatformBrowser` guards, not observed its actual prerender
behavior). Left unfixed here as out of scope for a merge-conflict pass;
worth a follow-up (e.g. lazy-load images without the carousel's
dimension-probing feature, or gate that specific behavior behind the same
`isPlatformBrowser` check used elsewhere in this PR).
