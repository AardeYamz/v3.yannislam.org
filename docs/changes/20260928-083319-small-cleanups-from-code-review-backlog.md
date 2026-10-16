Date: 2026-09-28 08:33:19

# Small Cleanups From The Code Review Backlog

Wraps up the last group of items from `docs/todo/code-review-optimization.md`'s
backlog: #7 (typewriter), #8 (LinkPreviewService), #9 (service worker
strategy), and #17 (misc small items) - plus desktop-performance.md's
"lazy-load animejs" item, folded in here since it touches the same file as
one of #17's items (`LoadingScreenComponent`).

## #7 - Replace `ngx-typed-js` with a signal-driven typewriter

`TypewriterComponent` (new, `src/app/components/home/banner/typewriter/`) is
a standalone component, ~70 lines, that types/erases each string in
`banner.typeSection` via chained `setTimeout`. It:

- Respects `prefers-reduced-motion` - shows the first string statically
  instead of animating.
- Only ever animates client-side - `ngx-typed-js`/typed.js called
  `getComputedStyle()`, which throws under Domino during server-side
  prerendering, which is why the old markup needed an `@if (isBrowser)`/
  `@else` split with a duplicated static fallback. The new component decides
  that internally, so `banner.component.html` just renders
  `<app-typewriter [strings]="...">` unconditionally, and `BannerComponent`
  no longer needs its own `isBrowser`/`PLATFORM_ID` field at all.
- Reads its `strings` input once in `ngOnInit` rather than reactively via
  `effect()` - the parent only ever binds it once (from `config.json`, at
  component creation), and `effect()`'s async scheduling would otherwise
  delay the very first render by a tick, which a first test caught (the
  component briefly showed `''` instead of starting the type-in immediately).

`ngx-typed-js` (and its `typed.js` dependency) is removed from `package.json`.

## #8 - `LinkPreviewService` timer leaks and iframe cost

- The two timers `show()`/`attemptIframe()` schedule (the hover-intent delay
  and the iframe's give-up timeout) are now stored and cleared in `hide()`,
  instead of the iframe timeout being an uncleared, fire-and-forget
  `setTimeout` on every single `show()`.
- A new 300ms hover-intent delay runs before the iframe attempt even starts,
  so a cursor merely passing over a trigger doesn't kick off a full page
  load for nothing.
- A new `blocksFraming()` helper (`link-preview-card.ts`) recognizes the same
  domains `ICON_BY_DOMAIN` already tracks (LinkedIn, GitHub, Facebook,
  Instagram, TikTok) - these are also the domains near-certain to send
  X-Frame-Options/CSP headers that refuse to be framed, so `show()` skips the
  iframe attempt for them outright rather than starting a load that's
  guaranteed to fail.

## #9 - Service worker caching strategy

`ngsw-config.json`'s `images-and-fonts` data group switches from
`"freshness"` (network-first, 1h maxAge, 3s timeout) to `"performance"`
(cache-first, 30d maxAge). These are static, rarely-changing assets - the old
strategy meant every repeat visit waited on the network, up to the 3s
timeout, before ever falling back to cache.

## #17 - Small items

- **`LoadingScreenComponent`**: the `MIN_DISPLAY_MS` `setTimeout` is stored
  and cleared in `ngOnDestroy`, alongside restoring
  `document.body.style.overflow` there too - previously, a component
  destroyed before `playOutro`'s `onComplete` ever ran left the whole page
  unscrollable. Also respects `prefers-reduced-motion` (skips the intro/
  breathe/scale-punch animation, holds briefly, then fades out), and
  lazy-loads `animejs` via `await import('animejs')` in `ngAfterViewInit`
  instead of a static top-level import - it's only ever needed by this one
  (unskippable, above-the-fold) intro animation, so it's now fetched as its
  own chunk instead of shipping in the initial bundle for every page load.
  This also folds in desktop-performance.md's "lazy-load animejs" item.
- **`FloatingLogosComponent`**: an `IntersectionObserver` on the host now
  pauses the rAF loop when the banner scrolls out of view, alongside the
  existing `visibilitychange`-driven pause for a backgrounded tab.
  `ngOnDestroy` uses `this.isBrowser` instead of a separate `typeof window`
  check, matching the rest of the class. `generateLogos()` calls
  `Math.random()` to pick each logo's count/variant/size/opacity, which is a
  guaranteed hydration mismatch for this purely decorative (`aria-hidden`)
  element - confirmed via a real-browser check that there was no console
  warning about it today only because Angular doesn't warn on `[style]`/
  count mismatches inside a `@for` the way it does for some other bindings,
  but the server and client DOM genuinely differed. Its usage in
  `banner.component.html` now carries `ngSkipHydration`, so the client does
  a normal fresh re-render of it instead of trying (and silently failing) to
  reconcile mismatched nodes.
- **`LogoFallbackDirective`/`LogoFallbackBackgroundDirective`**: `fellBack`/
  `failed` are now signals instead of plain booleans, for clarity - their
  `effect()`s were already correctly reactive via `themeService.accentColor()`,
  this just makes the dependency read more obviously from the field itself.
- **`AnalyticsService`**: `header.component.html`'s two
  `sendAnalyticEvent()` call sites passed `(navTitle, "menu", "click")` -
  action and label effectively swapped relative to every other call site's
  `(action, category, label)` shape (e.g. `("click_send_mail", "banner",
  "email")`). Normalized to `("click_nav", "menu", navTitle)`.
- **`ResumeService.open()`**: added a `PLATFORM_ID`/`isPlatformBrowser`
  guard, consistent with the rest of the codebase's SSR-safety pattern, even
  though it's only ever invoked from a click handler in practice.
- **`scripts/*.js`**: `require('fs')`/`require('path')` →
  `require('node:fs')`/`require('node:path')`.

## Verification

- `npm test` - 163/163 passing.
- `npm run build` - clean.
- Manually verified in a real browser (Puppeteer against the built
  `dist/` output, served locally): the typewriter animates correctly
  (SSR → hydration → live character-by-character typing, no flash of the
  full string before typing starts), the loading screen's intro/outro plays
  and `document.body.style.overflow` is restored, floating logos render with
  no hydration-mismatch console warnings, and no other console errors are
  introduced.
