Date: 2026-09-25 07:37:26

# P0 fixes from the code review backlog

The first PR out of `docs/todo/code-review-optimization.md`'s suggested
grouping ("P0 #1-#4 (assets, GA injection, typo, `/home` nav)"). Item #1
(the 3.6 MB About photo) is intentionally **not** included here — it's
already covered by the separately open image-optimization PR, and
redoing it here would just create a merge conflict with that work.

## What changed

- **`scripts/inject-env.js` now patches every built `*.html` file, not
  just the top-level `index.html`.** Every route is prerendered
  (`app.routes.server.ts`), so the build writes one HTML file per route
  under `dist/v3.yannislam.org/browser/` (`index.html`, `index.csr.html`,
  `projects/index.html`, `projects/highschool/index.html`,
  `aardeyamz/index.html`). All five come from the same `src/index.html`
  template and carried the same `%GOOGLE_ANALYTICS_ID%` placeholder, so a
  direct load of any route other than `/` shipped the literal placeholder
  string instead of a real GA ID. Verified with
  `npm run build && grep -rl '%GOOGLE_ANALYTICS_ID%' dist/v3.yannislam.org/browser`
  — clean after the fix (the string does still appear under
  `dist/v3.yannislam.org/server/`, which Vercel never serves per
  `vercel.json`'s `outputDirectory`, so that's expected and harmless).
- **`target="_black"` typo fixed** on the banner's "email me!" link
  (`banner.component.html`). It's a `mailto:` link, so `target` is
  dropped entirely rather than corrected to `_blank` — there's nothing to
  open in a new tab for a mail client handoff.
- **The header's scroll-to-section-from-another-route path no longer
  navigates to a nonexistent `/home` route.** `header.component.ts`'s
  `scroll()` called `this.router.navigate(['/home'])`, which only
  "worked" because the wildcard route redirects unknown paths to `/`.
  Fixed to navigate to `/` directly. Also fixed the timing bug this
  exposed: the old code scrolled to the target element immediately in the
  navigation promise's `.then()`, but `router.navigate()` resolving only
  means the route changed — not that `HomeComponent` has rendered its
  sections yet. Added `scrollToElementWhenReady()`, which polls for the
  element across a bounded number of animation frames instead of assuming
  render timing.
- **`vercel.json` gets explicit `Cache-Control` headers**, closing the
  TTFB gap `docs/todo/desktop-performance.md` P3 calls out (no caching
  headers existed beyond the security header block):
  - Hashed build output (`main-*.js`, `chunk-*.js`, `polyfills-*.js`,
    `styles-*.css` — content-hashed via `angular.json`'s
    `outputHashing: "all"`) gets `public, max-age=31536000, immutable`.
    A code change ships under a new hashed URL, never this one, so this
    is safe.
  - `/assets/fonts/**`, `/assets/images/**`, `/assets/resume/**` get the
    same immutable, year-long cache. These are static and unhashed, but
    stable by convention — fonts never change path, resume PDFs are
    dated filenames (see `CLAUDE.md`'s "Update Resume Download Link").
  - **Deliberately excluded:** `/assets/config.json` and
    `/assets/resume-manifest.json`. These are the two files that
    actually change between deploys — `config.json` is this site's
    entire content-editing surface per `CLAUDE.md`, and caching it
    immutably for a year would mean returning visitors don't see content
    edits until their browser cache naturally expires (which, under
    `immutable`, is effectively never within `max-age`). The desktop
    performance doc's blanket "`/assets/**`" suggestion would have
    caused this; scoped it to the three subdirectories that are
    genuinely safe instead.
  - `/`, `/projects`, `/projects/highschool`, `/aardeyamz` get
    `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` — the
    document itself always revalidates with the browser, but Vercel's
    edge can serve a 60s-old copy while revalidating in the background
    rather than round-tripping to origin on every request.

## Not included

- The About photo optimization and desktop-performance's P0 CLS items
  (typewriter `min-height`, font-display swap, `scrollbar-gutter`, image
  `aspect-ratio`) are already in flight on separate open PRs. Redoing
  them here would conflict.
- Cloudflare DNS/proxy configuration and cross-region TTFB measurement
  (`desktop-performance.md` P3) are infrastructure changes outside this
  repo's version control, not something a PR can fix.

## Test plan

- `npm run build` succeeds; verified GA injection by grepping the
  built output for the placeholder string (see above).
- `npm test` (Karma/Jasmine) — see PR test plan checklist.
