Date: 2026-07-31 18:48:00

# Service worker: asset caching + offline support

Adds `@angular/service-worker` to the project via `ng add @angular/pwa`, so
the built app installs a service worker that caches the app shell for
offline use, then reconciles what the schematic generated against the
site's existing, hand-configured manifest identity rather than letting it
get overwritten with Angular's generic PWA defaults.

## Running the schematic

`ng add @angular/pwa` needed a couple of environment/version workarounds
that are worth recording since they'd trip up a re-run:

- The sandbox's default `node` (v22.22.2) is below the Angular CLI 22's
  minimum (`^22.22.3`). Installed v22.22.3 via `nvm` for this session only
  (not persisted anywhere in the repo).
- `ng add @angular/pwa` (unpinned) failed during package resolution — its
  own `npm view`-based lookup errored out even though the registry was
  reachable directly. Pinning the version (`ng add @angular/pwa@22.0.8`,
  matching the repo's installed `@angular/core`) got the schematic itself
  to run, but its `npm install @angular/service-worker@^22.0.8` step then
  hit a **real** `ERESOLVE` conflict: `^22.0.8` resolves to the newest
  matching publish, `22.1.0`, whose peer `@angular/core` requirement
  (`22.1.0`) doesn't match this repo's pinned `22.0.8`. Fixed by editing
  `package.json` to pin `@angular/service-worker` to the exact `22.0.8`
  (matching the rest of the `@angular/*` packages, which are already
  `^22.0.8` against an installed `22.0.8` — new dependency, so pinned
  exactly rather than assuming a caret range would resolve safely) and
  re-running `npm install`.

What the schematic did correctly, left as-is:
- `angular.json`: added `"serviceWorker": "ngsw-config.json"` to the
  production build configuration.
- `package.json`: added the `@angular/service-worker` dependency (see
  above for the version pin).
- `src/app/app.module.ts`: added `ServiceWorkerModule.register('ngsw-worker.js',
  { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`
  to `AppModule`'s `imports` (only reformatted, no logic changes, to drop
  some stray blank lines the schematic's code-mod left behind).
- Generated `ngsw-config.json`, rewritten — see below.

What the schematic got wrong for this repo, and was reverted/replaced:
- **`src/index.html`**: the schematic re-serialized the entire `<head>`
  through its HTML parser, collapsing several multi-line `<meta>` tags onto
  one line and turning `async` into `async=""` — pure noise, no functional
  change — and then appended a **second**, duplicate
  `<link rel="manifest" href="manifest.webmanifest">` (the first one
  already existed; this project didn't need the schematic to add a
  manifest link at all). Reverted entirely with `git checkout -- src/index.html`.
- **Manifest + icons**: see below, this is the main reconciliation.

## Manifest reconciliation

The project already serves `src/manifest.webmanifest` (referenced from
`src/index.html`, listed as a build asset in `angular.json`). Before this
change its contents were still Angular's own generic scaffold defaults —
`"name": "v3.yannislam.org"`, `"theme_color": "#1976d2"` (Angular Material
blue), `"background_color": "#fafafa"`, no `icons` array — never actually
filled in with the site's real identity, even though `src/assets/config.json`
had already been carrying the real values for a while
(`manifestName`, `manifestShortName`, `manifestThemeColor`,
`manifestBackgroundColor`, `manifestDisplay`, `manifestStartUrl`,
`manifestIcon`, added per `documentation/logo-svg-dark-mode.md`'s
`manifestIcon` update) — those fields aren't read by any code path, so they
never made it into the actual manifest file.

Running the schematic proved out why the file was worth guarding: `ng add
@angular/pwa` doesn't touch a pre-existing `src/manifest.webmanifest` at
all (it only detects the `<link rel="manifest">` tag already being
present and skips creating one at that path) — but it unconditionally
generated a **second**, disconnected manifest and icon set: `public/
manifest.webmanifest` and eight generic Angular-logo PNGs at `public/icons/
icon-*.png`. This repo's `angular.json` doesn't use the newer "public
folder" build convention (its asset list is explicit:
`src/favicon.ico`, `src/assets`, `src/manifest.webmanifest`), so
`public/manifest.webmanifest` and `public/icons/` were never wired into the
build — dead files with generic content and the default Angular pwa icon,
sitting in the repo. Deleted the whole `public/` directory rather than
carrying it forward unused.

`src/manifest.webmanifest` was rewritten using `config.json`'s existing
`manifest*` fields as the source of truth for the site's real identity:

```json
{
  "name": "yannislam.org",
  "short_name": "YL",
  "theme_color": "#ff8b00",
  "background_color": "#ff8b00",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "assets/images/logos/clearcolor.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
```

The single icon entry points at `clearcolor.svg`
(`src/assets/images/logos/clearcolor.svg`, matching `config.json`'s
`manifestIcon`), the same full-color vector logo already used everywhere
else on the site (`documentation/logo-svg-dark-mode.md`). No PNG icon set
was (re-)generated: as that doc notes, this environment has no image
rasterization tooling (no ImageMagick/`rsvg-convert`/`sharp`/`cairosvg`
available), which is exactly why the site's logo assets were already moved
to hand-written SVG instead of raster PNGs. A single `"sizes": "any"` SVG
icon is valid per the Web App Manifest spec and installable in
Chromium-based browsers; it just isn't declared `"purpose": "maskable"`,
since `clearcolor.svg` has no built-in safe-zone padding for Android's
adaptive-icon circular/squircle crop — marking it maskable as-is would risk
the mark getting clipped. If broader (older Safari/iOS-style
`apple-touch-icon`, multi-resolution PNG) icon support is wanted later,
that would need real PNG rasterization, which is a follow-up outside what
this environment can produce.

`scope`/`start_url` were set to `"/"` (`config.json`'s
`manifestStartUrl`) rather than the scaffold's relative `"./"` — the site
already serves from `<base href="/">`, so an absolute scope matches how
the rest of the app resolves paths.

## Caching strategy (`ngsw-config.json`)

The generated config's default two-`assetGroup` split (a `prefetch` "app"
group for the shell, a `lazy` "assets" group for every image/font
extension anywhere under the site) was replaced with a split that treats
the app shell and the large binary assets under `src/assets/images/` and
`src/assets/fonts/` differently, per what each actually needs:

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.csr.html",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "images-and-fonts",
      "urls": [
        "/assets/images/**",
        "/assets/fonts/**"
      ],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "3s"
      }
    }
  ]
}
```

**App shell (`app` group, unchanged from the schematic's default) —
`installMode: "prefetch"`.** `index.html`, the manifest, and the
output-hashed `*.js`/`*.css` bundles (`angular.json`'s production config
already has `"outputHashing": "all"`, so bundle filenames change whenever
their content does) get fetched and cached as soon as the service worker
installs. This is the standard, safe choice for versioned build output:
every deploy produces new hashed filenames, so there's no way for a stale
prefetched bundle to be served under the URL a new `index.html` actually
references.

**Images and fonts — moved out of `assetGroups` entirely, into a
`freshness`-strategy `dataGroup`.** The task called for "lazy install mode
+ a freshness/short-`maxAge` strategy" for these; in practice those two
don't compose the way that phrasing suggests, so this went with whichever
of the two actually delivers on the "don't serve a stale image/font after
a deploy" goal. Angular's service worker checks `assetGroups` before
`dataGroups` on every fetch (`ngsw-worker.js`'s `AppVersion.handleFetch`) —
if a URL matches an `assetGroup` pattern, that group's own (hash-manifest-driven,
all-or-nothing-per-version) caching handles it and the request never
reaches `dataGroups` at all. `assetGroups` don't support `cacheConfig`
(`strategy`/`maxAge`/`timeout`) — that's a `dataGroups`-only concept. So an
`assetGroup` (even `installMode: "lazy"`) covering the same
`/assets/images/**` and `/assets/fonts/**` paths as a `freshness`
`dataGroup` would make the `dataGroup` entry dead code for every file the
`assetGroup` already claims — freshness would never actually apply.
Dropping the `assetGroup` for these paths and relying solely on the
`dataGroup` gets a stronger version of what "lazy" was meant to provide
(nothing here is prefetched at install; it's fetched purely on demand) and
makes the `freshness` strategy the one that's actually live: each request
tries the network first (up to the `3s` timeout), only falling back to a
cached copy if the network doesn't respond in time, and any cached copy is
evicted after `1h` (`maxAge`) regardless. That means a new photo or font
file pushed in a deploy is visible on next load without the visiting
browser needing to detect a whole new app version first — the tradeoff
being one network round-trip per image/font on every visit (bounded to
`3s` before falling back to cache), rather than an unconditional cache hit.
`maxSize: 100` bounds how many distinct images/fonts get held in this
cache at once (LRU eviction beyond that), since unlike the hash-versioned
app shell, nothing here is cleaned up by an app-version boundary.

The prior default catch-all `assets` group (matching every
`svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2` file anywhere
in the build) was dropped rather than narrowed, since every file in this
repo matching those extensions already lives under `src/assets/images/` or
`src/assets/fonts/` (confirmed via a filesystem search) — there's nothing
left for a separate group to cover.

## Files touched

- `angular.json` — `serviceWorker: "ngsw-config.json"` added to the
  production build config (schematic-generated, kept as-is).
- `package.json` / `package-lock.json` — `@angular/service-worker` added,
  pinned to the exact `22.0.8` (see "Running the schematic").
- `src/app/app.module.ts` — `ServiceWorkerModule.register(...)` wired into
  `AppModule` (schematic-generated, reformatted only).
- `ngsw-config.json` — new, rewritten from the schematic's default (see
  "Caching strategy" above).
- `src/manifest.webmanifest` — rewritten with the site's real name/theme/
  background/icon (see "Manifest reconciliation" above); previously held
  Angular's generic scaffold defaults.
- `src/index.html` — schematic's changes reverted (`git checkout`); no net
  change, the manifest `<link>` it wanted to add already existed.
- `public/` (schematic-generated `manifest.webmanifest` + `icons/*.png`) —
  deleted; disconnected from this repo's build (see "Manifest
  reconciliation").

## Verification

- `npx ng build --configuration production` — succeeds. `dist/
  v3.yannislam.org/browser/` contains `ngsw-worker.js` and `ngsw.json`
  alongside the existing hashed bundles and `manifest.webmanifest`.
  Inspected the generated `ngsw.json`: the `app` asset group's `urls` list
  is exactly the hashed JS/CSS bundles + shell files (`favicon.ico`,
  `index.html`, `manifest.webmanifest`); the `hashTable` has **no** entries
  under `/assets/images/` or `/assets/fonts/`, confirming those paths
  aren't being swept into the versioned asset-group cache and are only
  reachable through the `images-and-fonts` `dataGroup` as intended.
  Pre-existing budget warning on `header.component.scss` (5.50 kB vs a 5 kB
  budget) is unrelated to this change and was already present on `main`.
- Served `dist/v3.yannislam.org/browser` locally with a plain static file
  server (`npx http-server`) and confirmed via `curl` that `/`,
  `/ngsw.json`, `/ngsw-worker.js`, `/manifest.webmanifest`, and
  `/assets/images/logos/clearcolor.svg` all return `200`, and that
  `manifest.webmanifest`'s served content matches the reconciled real
  identity (name, theme/background color, icon).
- **What could not be verified here**: actual service worker registration
  and activation, and real cache-hit/offline behavior. Service workers
  only register in a "secure context" — HTTPS, or `http://localhost`
  specifically — and exercising that (DevTools → Application → Service
  Workers showing an activated worker, toggling the network offline and
  confirming the shell still loads, watching a `freshness`-strategy image
  request actually race network vs. cache) needs a real browser. No
  browser automation tool (Playwright/Puppeteer/a Chromium binary) is
  available in this sandbox, and no real HTTPS-served deployment exists to
  point one at even if it were. That end-to-end check should happen after
  this deploys to the real site (or against a local HTTPS/`localhost`
  server in an environment with a browser available) — this change is
  verified as producing correct build output and a schema-valid,
  intentionally-structured `ngsw-config.json`, not as having been observed
  actually caching or serving offline.
