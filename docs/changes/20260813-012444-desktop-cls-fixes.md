Date: 2026-08-13 01:24:44

# Desktop CLS / FCP Fixes (P0 batch from desktop-performance.md)

Works through the P0 (CLS) items in `docs/todo/desktop-performance.md`, plus
a few quick P1/P2 wins called out there as safe to land independently of the
larger prerendering/Font Awesome work. All changes are CSS/markup/one-line
diffs — no architectural changes (no SSR/prerendering, no Font Awesome
removal, no service worker changes).

## What shipped

**P0 — CLS:**

- **Typewriter heading min-height** (`banner.component.scss`). `.typing` now
  has `min-height: 1.1em`, matching the `h3`'s own `line-height`. Because
  `em` is relative to the element's own font-size, this automatically tracks
  every breakpoint override in `styles.scss` (`70px`/`60px`/`50px`/`40px`
  down, `100px`/`120px` up) without needing per-breakpoint rules.
- **Font swap eliminated for above-the-fold text** (`fonts.scss`,
  `index.html`). Calibre Semibold (banner `h2` name) and SF Mono Regular
  (banner `h1` greeting, header nav numbers) switched from
  `font-display: swap` to `font-display: optional`, paired with new
  `<link rel="preload">` tags for both — plus a third preload for Calibre
  Regular (body copy). `optional` either uses the webfont immediately (the
  preload makes that likely) or falls back for the whole page load; it never
  swaps mid-visit and reflows text. Metric-adjusted fallback faces
  (`size-adjust`/`ascent-override`/`descent-override`) were **not** added —
  that's the other half of the todo's two-option list and is left for a
  follow-up if `optional`'s occasional fallback-for-the-load behavior proves
  too aggressive on slow connections.
- **Scrollbar-gutter reserved** (`styles.scss`). Added
  `scrollbar-gutter: stable` to `html`. `LoadingScreenComponent` still
  toggles `document.body.style.overflow` around its boot animation, but the
  gutter is now always reserved, so that toggle no longer changes the
  viewport width and double-shifts every element in the centered Bootstrap
  container.
- **Floating logos reserve height** (`floating-logos.component.html`). Added
  `[style.height.px]="logo.size"` alongside the existing
  `[style.width.px]`. These elements are `position: absolute` (confirmed in
  `floating-logos.component.scss`), so they don't participate in layout and
  weren't actually contributing to CLS either way — this is a decode-time
  correctness fix more than a layout-shift fix.
- **Work-history image aspect ratio — not shipped.** These are
  per-organization photos of unknown, varying dimensions pulled from
  `config.json`. Guessing a single `aspect-ratio` risks cropping/distorting
  real content via `object-fit`. Needs real per-image dimensions (or a
  per-entry aspect-ratio field in `config.json`) before it's safe — left
  open in the todo doc.

**P1 — quick wins:**

- **`MIN_DISPLAY_MS` cut from 1400ms to 400ms** (`loading-screen.component.ts`).
  The one-line change the todo doc called out as worth landing regardless of
  the larger loading-screen/prerendering decision. The overlay is the LCP
  element until it fades, so this is ~1s straight off FCP/LCP.

**P2 — asset weight:**

- **About-page portrait resized and re-encoded.** `profile4.jpg` was
  2671×3562 (3.6 MB) rendered at 300×400 — roughly 100× overdraw. Replaced
  with `profile.jpg`/`profile@2x.jpg` (300×400 / 600×800, mozjpeg q82) and
  `profile.webp`/`profile@2x.webp`, served via `<picture>` with a WebP
  `<source>` and a JPEG `<img srcset>` fallback (both 1x/2x). The unused
  `profile0/1/2/3.jpg` and `profileedit.png` (nothing in `src/` referenced
  them) were deleted. `src/assets/images` went from **16 MB → ~2.3 MB**.
  AVIF was not added — WebP already gets the "modern format" win here, and
  a third encode for marginal gains over WebP wasn't worth it against a
  mozjpeg fallback that already covers non-WebP browsers.
- **`loading="lazy" decoding="async"` on work-history images**
  (`workhistory.component.html`). Applied to all four `<img>` render paths
  (carousel + static box, both alternating column positions) — these are
  below-the-fold. The About portrait was deliberately left eager: it's near
  the fold and now only ~22 KB, so lazy-loading risked a visible late pop-in
  for negligible byte savings. `fetchpriority="high"` on the real LCP
  element is still open — it depends on which element that ends up being,
  which itself depends on the (unshipped) prerendering work.

## What's still open

Everything else in `desktop-performance.md`'s P1 (Font Awesome trim, service
worker asset-group strategy, animejs lazy import, prerendering), P2 (project
image compression, dropping a redundant analytics script), and P3 (TTFB —
Cloudflare↔Vercel proxy hop, `vercel.json` cache headers) is unchanged. Those
are either bigger architectural calls (prerendering, Font Awesome removal)
or infrastructure/DNS configuration outside this repo's code, and weren't
attempted in this pass. The doc's checkboxes reflect exactly what's done vs.
still open, including two items marked "partially shipped" with the
reasoning for what was deliberately left out.

## Verification

This sandbox's Node is v22.22.2; `ng build`/`ng test` both require
v22.22.3+/v24.15.0+/v26.0.0+ and refuse to run here — a pre-existing
environment constraint, not something introduced by this change. Verified
instead with:

- `npx tsc --noEmit -p tsconfig.app.json` — clean, no errors.
- `npx sass` compiled `styles.scss`, `banner.component.scss`, and
  `fonts.scss` directly — all compile cleanly (only pre-existing Bootstrap
  deprecation warnings, unrelated to these changes) — and the compiled CSS
  was grepped to confirm `scrollbar-gutter: stable`, the new `min-height`,
  and the `font-display: optional` rules all land as written.
- Manually traced `about.component.spec.ts` and the work-history specs for
  any hardcoded reference to the old `profile4.jpg` filename or to the
  loading screen's timing — none found, so the suite shouldn't need updates.

A real CI run (which uses a compliant Node version) is the first place this
will get exercised through `ng build`/`ng test`/Lighthouse — worth watching
that run rather than assuming green.

## Fixed: lazy-loaded work-history thumbnail failed its e2e visibility check

CI's `e2e` job failed on `e2e/home-sections.spec.ts:45`: the seventh
work-history entry's static thumbnail
(`.img-feature-workhistory-container img.img-feature-workhistory`) stayed
`hidden` for the full 10s timeout instead of becoming visible.

**Root cause.** That `<img>` has no `width`/`height` attributes and no
`aspect-ratio` — its layout box is sized entirely from the decoded image
once loaded. Adding `loading="lazy"` to it meant the browser deferred the
fetch until the element neared the viewport; at 1280×720 (Playwright's
default "Desktop Chrome" viewport, which is also the only width where this
container isn't `display: none` — see `workhistory.component.scss`), the
seventh entry sits far enough down the page that it never enters the
lazy-load threshold without an actual scroll, so the image never loads and
the box never gets a size.

The carousel copy of the same image (`owl-carousel-o` inside the same
entry) is unaffected: it's genuinely decorative/duplicate content that the
e2e suite never asserts on, and is invisible outright at this viewport
width regardless of load state.

**Fix.** Dropped `loading="lazy" decoding="async"` from the static
thumbnail's `<img>` (`workhistory.component.html`), keeping it only on the
carousel slide's copy. This is the same per-image-aspect-ratio gap the P0
section above already flagged as unshipped — the real fix (reserving space
via `width`/`height`/`aspect-ratio` so lazy-loading is safe everywhere)
still needs real per-organization image dimensions and is left for that
follow-up.

## Fixed: boot smoke test raced the shortened loading screen

Running the full e2e suite against current `main` (this branch's changes
plus everything merged since PR #68 was opened) turned up a second, unrelated
flake: `e2e/smoke.spec.ts`'s "home page boots" test asserts `.loading-screen`
is visible immediately after `page.goto('/')` resolves. That `goto()` used
the default `waitUntil: 'load'`, which blocks on every subresource (fonts,
images, third-party scripts) — a wait with no fixed ceiling that, on a
slower load, can now easily exceed `LoadingScreenComponent`'s entire
boot-to-hidden cycle (`MIN_DISPLAY_MS` + the outro timeline, ~1.25s total
post-`MIN_DISPLAY_MS`-cut, versus ~2.25s before). The test occasionally
resolved `goto()` only after the overlay had already faded, failing the very
next assertion.

**Fix.** Changed that one `goto('/')` to `waitUntil: 'domcontentloaded'`,
which resolves as soon as the initial document is parsed — well before the
overlay's ~1.25s cycle can complete — instead of waiting on unrelated
subresource loads. Confirmed with several repeated local runs of the test
that this removes the race entirely.
