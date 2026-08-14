# PR #24 (SSR prerendering) — measured review

[PR #24 — "Add SSR scaffolding + static prerendering for all known
routes"](https://github.com/AardeYamz/v3.yannislam.org/pull/24), reviewed
against the desktop performance problems in
[`desktop-performance.md`](./desktop-performance.md).

**Verdict: it fixes FCP and LCP emphatically, does nothing for CLS, and
ships four regressions.** Do not merge as-is — the five fixes at the bottom
are small, and without them the prerendered page is visibly worse than the
current one for the first few seconds of every load.

---

## Measured results

Both branches built and loaded in Chromium at 1920×1080, 4× CPU throttle,
5 Mbps / 40 ms latency, served from a local static file server.

| Metric | `main` | PR #24 | Change |
| ------ | ------ | ------ | ------ |
| FCP | 2612 ms | **228 ms** | 11× faster |
| LCP | 3832 ms | **228 ms** | 17× faster |
| CLS | 0.0056 | **0.0659** | 12× worse |

The `main` figures (2.6 s / 3.8 s) land close to the Vercel field numbers
(FCP 3.17 s, LCP 3.62 s), which is a reasonable sanity check that this lab
setup approximates the field for those two metrics.

### Caveat on the CLS column

The lab does **not** reproduce the field CLS of 0.68, in either column:

- fonts are served from localhost and arrive instantly, so there is no
  `font-display: swap` reflow;
- headless Chromium uses overlay scrollbars, so the
  `document.body.style.overflow` toggle does not change layout width.

So read CLS as a **relative** signal only: PR #24 introduces roughly 0.06 of
*new* layout shift on top of whatever the field is already measuring.

### Layout shifts recorded on PR #24

```
t=620ms   v=0.0001  DIV.nav-right
t=737ms   v=0.0551  DIV.content | DIV.div-btn-banner   ← the new regression
t=776ms   v=0.0025  DIV.content | DIV.div-btn-banner
t=872ms   v=0.0004  UL.footer-left-bar
t=4173ms  v=0.0079  DIV.content.ng-animating
```

`main` recorded a single shift: `t=3053ms v=0.0056 DIV.content`.

---

## What it fixes

- [x] **P1 "Prerender the home route"** from `desktop-performance.md`. The
      home route's `index.html` is now 193 KB of real content with
      `ng-server-context="ssg"` — banner copy, header, blurb and CTAs are
      all in the HTML. FCP/LCP no longer wait on the JS bundle booting.
      This was the single biggest item on the list and the PR does it.

## What it does not fix

None of the P0 CLS items are touched:

- no `min-height` on `.typing`;
- no metric-matched font fallbacks (`src/fonts.scss` unchanged);
- `document.body.style.overflow` is still toggled
  (`loading-screen.component.ts:66,134`);
- work-history images still have no `width`/`height`/`aspect-ratio`.

Font Awesome, the 16 MB image directory and the service-worker `freshness`
strategy are all untouched too, as expected — those are separate items.

---

## Regressions introduced

### 1. Duplicate heading for several seconds

The server renders the `@else` branch —
`<h3 class="typing">I am a Full Stack Software Developer</h3>`. On
hydration, `@if (isBrowser)` flips true and adds ngx-typed-js's *empty* h3,
but the server-rendered node stays in the DOM. Probed live:

```
t=250ms   1 h3: "I am a Full Stack Software D" h=176   btnTop=864
t=500ms   2 h3: "" h=0            + "I am a Full Stack Software D" h=176
t=700ms   2 h3: "I" h=88          + "I am a Full Stack Software D" h=176   btnTop=908
t=3000ms  2 h3: "I am an " h=88   + "I am a Full Stack Software D" h=176
t=5000ms  1 h3: cleaned up
```

This is the source of the `v=0.0551` shift at 737 ms and it moves the CTA
buttons down 44px. It does self-resolve, but only after seconds of
displaying two different headings stacked on top of each other.

Note: the cleanup appears to happen on a later change-detection pass, and
the most likely trigger is the loading screen's outro completing at
~2.25 s. That link is **not verified** — but if it holds, removing the
loading screen (fix 3) without also doing fix 2 could make the duplicate
heading permanent. Doing both fixes makes the question moot.

### 2. The loading screen re-covers the already-painted page

`hidden = false` is the field initializer
(`loading-screen.component.ts:28`). The prerendered HTML correctly ships
`class="loading-screen loading-screen--hidden"`, but hydration re-evaluates
the binding and strips `--hidden` at ~500 ms. `.loading-screen` has
`transition: visibility 0s linear 0.5s`, so `visibility` returns to
`visible` at ~900 ms and the opaque navy overlay
(`position: fixed; inset: 0; background-color: $Navy`) sits on top of
content that painted at 228 ms until the outro finishes.

Observed sequence: content at 228 ms → covered → revealed again ~2.5 s
later. It does clean up correctly — by 5 s the overlay is
`visibility: hidden`, `opacity: 0`, `pointer-events: none`, and buttons
hit-test fine (`document.elementFromPoint` over the CTA returns
`A.main-btn`). So this is a visual regression, not a broken page.

### 3. Theme flash on every load

`ThemeService.resolveInitialMode()` returns `'default'` on the server, so
every visitor gets navy HTML regardless of their stored or OS preference,
then a full-page recolor once `localStorage` / `prefers-color-scheme` is
read on the client. Measured flip to `data-theme="light"` at ~500 ms.

Previously this was invisible, because nothing painted until JS had already
resolved the theme. Prerendering exposes it.

### 4. Google Analytics broken on 3 of 4 routes

`scripts/inject-env.js` only rewrites `dist/…/browser/index.html`.
Prerendering now emits four HTML files, and the three new ones still
contain the literal placeholder:

```
projects/index.html:            3 × %GOOGLE_ANALYTICS_ID%
projects/highschool/index.html: 3 × %GOOGLE_ANALYTICS_ID%
aardeyamz/index.html:           3 × %GOOGLE_ANALYTICS_ID%
index.html:                     0  (correctly substituted)
```

Those pages will request
`googletagmanager.com/gtag/js?id=%GOOGLE_ANALYTICS_ID%`.

### Also worth noting

- **Banner blanks and re-animates at ~800 ms.** The `@bannerTrigger`
  fade-stagger `:enter` animation replays over the hydrated content, so the
  banner briefly empties out to just "Hello! My name is" before fading back
  in. Not CLS (it is transform/opacity), but it undercuts the perceived
  speed the prerender just bought.
- **`@types/node` is downgraded** from `^26.1.2` to `^20.17.19` in
  `package.json`. Looks unintentional.

---

## Required before merge

- [ ] **Add `min-height: 1.1em` to `.typing`** (and at each breakpoint where
      the `h3` font-size changes). This is the existing P0 item and it also
      blunts the duplicate-heading shift.
- [ ] **Make the server and client render structurally identical markup.**
      Emit the same `<h3 class="typing">` on both sides and let typed.js
      adopt the existing node, or drive the swap with `afterNextRender` /
      `@defer` instead of `@if (isBrowser)`. A structural `@if` difference
      across hydration is what strands the server node.
- [ ] **Remove the loading screen.** With prerendering it has gone from
      merely wasteful to actively harmful: it now hides content that has
      already painted. If it must stay, initialize it so it never re-shows
      over prerendered output.
- [ ] **Set the theme before first paint.** Inline a small blocking script
      in `index.html` that reads `localStorage` / `matchMedia` and sets
      `data-theme` on `<html>` — the standard anti-FOUC snippet.
- [ ] **Fix `scripts/inject-env.js`** to walk every `index.html` under the
      browser output directory rather than just the root one.

## Still unresolved from the PR's own description

The PR adds `outputMode: "server"`, `src/server.ts` and `express`, while
`vercel.json` still only sets `buildCommand` and `outputDirectory` with no
`framework` or `rewrites`. Whether Vercel serves the per-route files
correctly, still falls back properly for unlisted paths, and does *not* try
to deploy `server.mjs` as a function is untested. That needs a real preview
deploy before merge, as the PR author already flagged.

---

## How to reproduce

```bash
# Angular CLI 22 needs Node >= 22.22.3
git worktree add /tmp/pr24 origin/claude/add-ssr-prerendering
git worktree add /tmp/mainbase origin/main
(cd /tmp/pr24 && npm ci && npm run build)
(cd /tmp/mainbase && npm ci && npm run build)
# then serve each dist/v3.yannislam.org/browser and collect
# paint / largest-contentful-paint / layout-shift via PerformanceObserver
```
