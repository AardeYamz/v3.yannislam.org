# Zoneless change detection

## Context

Every component in `src/app/components` already runs `ChangeDetectionStrategy.OnPush`
(added in an earlier PR) — the main precondition for Angular's zoneless mode.
This change removes `zone.js` entirely and switches the app to Angular 22's
stable `provideZonelessChangeDetection()`. Dropping zone.js removes a ~35KB
polyfill and, more importantly, the runtime monkey-patching it does to every
`setTimeout`, DOM event listener, `fetch`, `Promise`, etc. so that any of
those firing anywhere in the app would trigger a change-detection pass. Going
zoneless means each place that used to rely on that implicit trigger needs an
**explicit** one — a signal write or a `ChangeDetectorRef.markForCheck()` call.
The risk is a silently-stale view: no console error, the app just stops
reacting to something.

## Core change

- `src/main.ts` — `provideZoneChangeDetection()` → `provideZonelessChangeDetection()`
  (verified against `@angular/core`'s actual `fesm2022/core.mjs` exports for
  this installed version, `22.0.8` — both are real, currently-exported
  symbols, not a guess at Angular 22's API surface).
- `angular.json` — `zone.js` removed from both the `build` target's
  `polyfills` array and the `test` (karma) target's `polyfills` array.
- `package.json` — `zone.js` dependency removed; `package-lock.json`
  regenerated via `npm install`. `zone.js` still appears once in the lockfile,
  but only as `@angular/core`'s own **optional peer dependency** metadata
  (`"optional": true, "peer": true`) — `npm ls zone.js` confirms nothing in
  this project's own dependency tree requires it. It is not bundled (see
  Verification below).
- `src/app/directives/logo-fallback/logo-fallback-background.directive.spec.ts`
  — its two tests used `fakeAsync()`/`flushMicrotasks()`, which throw at
  runtime ("zone-testing.js is needed for the fakeAsync() test helper") once
  `zone.js/testing` is no longer a loaded polyfill. Rewritten as plain
  `async` tests that `await Promise.resolve()` once instead — the stubbed
  `Image`'s load/error callback in that spec resolves via exactly one
  microtask (`Promise.resolve().then(...)`), so awaiting a microtask turn is
  equivalent to `flushMicrotasks()` here without needing zone.js at all.

No other spec file uses `fakeAsync`/`waitForAsync`/`tick`, and none of them
configure zone-related TestBed providers — Angular 22's `TestBed` already
injects `provideZonelessChangeDetectionInternal()` into every testing module
by default (see `@angular/core/fesm2022/testing.mjs`), independent of
whether the app itself is zone-based, so no spec needed further changes for
this migration.

## Audit of implicit change-detection triggers

Every place named in the task as a candidate for a missing explicit trigger,
and what was found:

### `loading-screen.component.ts`
Two animejs callbacks mutate component state:
- `playIntro()`'s `onComplete` calls `playBreathe()`, which only assigns a
  private field (`this.breathe`) never read by the template — no CD needed.
- `playOutro()`'s `onComplete` sets `this.hidden = true` (gates
  `[class.loading-screen--hidden]` in the template) and **already** called
  `this.cdr.markForCheck()` immediately after, from an earlier PR, with a
  comment explaining exactly why. Verified this is the only state mutation
  inside any animejs callback in this file — no gap found, no change made.

### `floating-logos.component.ts`
- The `effect()` that reshuffles logo colors on theme change already calls
  `this.cdr.markForCheck()` after `reshuffleColors()` mutates `logo.variant`
  in place (read by `[src]` in the template) — verified complete, no change.
- The `requestAnimationFrame` render loop (`render()`) writes directly to
  `el.style.transform` on the native element — never through an Angular
  binding — so it doesn't participate in change detection at all, zoneless
  or not. Confirmed still true; left alone.

### `header.component.ts`
`@HostListener('window:scroll')` sets `this.pageYPosition`, read by the
template (`[class.nav-shadow]`, and indirectly via the `logoRotationDeg`
getter bound to `[style.transform]`). Checked whether this still triggers CD
under zoneless rather than assuming it does: Angular compiles `@HostListener`
(including global targets like `window:`) to the same `ɵɵlistener` /
`ɵɵresolveWindow` instructions used for template event bindings
(`(click)="..."`), not a raw `addEventListener` — confirmed in
`@angular/core/fesm2022/core.mjs`. Those instructions go through Angular's
own event-dispatch pipeline, which notifies the change-detection scheduler
on every dispatch **independent of zone.js** — this is Angular's own
mechanism, not something zone.js layers on top of. No `markForCheck()`
needed, and the interactive verification below confirms the nav-shadow class
and logo rotation both update live on scroll.

### AOS directive (`src/app/directives/aos/aos.directive.ts`)
Its `IntersectionObserver` callback does
`element.classList.toggle('aos-animate', entry.isIntersecting)` directly on
the native element — not through an Angular `[class.x]` binding — so, like
`floating-logos`'s render loop, it never touched change detection in the
first place and needs no `markForCheck()`. (Contrast with
`logo-fallback-background.directive.ts`, which follows the identical
pattern — an `Image` `onload`/`onerror` callback writing straight to
`el.nativeElement.style.backgroundImage` — for the same reason.)

### `ngx-owl-carousel-o` / `ngx-typed-js`
- **`ngx-typed-js`** (`2.1.1`): its Angular wrapper component has no
  `NgZone` dependency at all (confirmed by grepping the built package for
  `NgZone`/`zone.run` — no hits) and its template is just a static
  `<div #wrapper><ng-content></ng-content></div>`. The actual typed-text
  effect is `typed.js` writing directly into the DOM node inside
  `<ng-content>`, bypassing Angular's rendering entirely — the same
  "raw DOM write, not an Angular binding" pattern as the directives above.
  The app doesn't bind any of its `(completed)`/`(stringTyped)`/etc.
  `EventEmitter` outputs either, so there's no Angular-tracked state
  involved anywhere in this integration.
- **`ngx-owl-carousel-o`** (`22.0.0`, the Angular-22-targeted release): it
  *does* use `NgZone` internally (`AutoplayService` wraps its autoplay
  timer in `ngZone.runOutsideAngular(() => setTimeout(() => ngZone.run(...)))`),
  and separately its `CarouselComponent` already calls
  `this.changeDetectorRef.markForCheck()` explicitly whenever the carousel's
  view-state observable emits, with an in-source comment: *"despite the fact
  we have signals here, they work with some delay, so we need to trigger
  change detection manually"* — i.e. this library's own authors already
  hardened it against exactly the kind of gap this migration is auditing
  for, independent of whether the host app provides zone.js. See "Known
  issue" below, though: this component's autoplay was found to be broken —
  but proven, via an A/B test, to be a **pre-existing bug unrelated to this
  migration** (present identically with zone.js still active), not
  something this PR introduced or needs to fix.

### `contact.component.ts`
No reactive form (`FormControl`/`FormGroup`) anywhere in this component —
just a template-bound `(click)` handler on a `mailto:` link, which goes
through Angular's own event pipeline exactly like the header's
`HostListener` case above. `header.component.ts`'s unused
`languageFormControl: FormControl` field was also checked; it isn't bound
in the template at all, so it's inert either way. Nothing to change.

## Known issue (pre-existing, not caused by this migration)

**The workhistory section's `owl-carousel-o` autoplay does not visibly
advance slides**, in either zoneless or zone.js-based builds.

This was caught by the interactive verification below (watching the
carousel's `.owl-stage` transform for >3 autoplay intervals) and initially
looked exactly like the silent-breakage scenario this migration was meant to
guard against. Root-caused via instrumentation added temporarily to the
installed `ngx-owl-carousel-o` package (not part of this diff) plus an A/B
comparison:

- The autoplay timer *does* fire and *does* call `carouselService.next()`
  (confirmed via console tracing) in both the zoneless build and a control
  build with `zone.js` restored.
- Tracing further into `CarouselService.to()` (the method `next()` calls)
  shows the actual slide-position update is scheduled via a **second,
  unwrapped `setTimeout`** nested inside the one `AutoplayService` already
  wraps in `ngZone.run()` — i.e. even the zone.js-based control build
  exhibits the identical stuck-at-`translate3d(0px, 0px, 0px)` behavior
  after 12+ seconds of waiting.

Since the exact same instrumented library produces the exact same failure
with `zone.js` present, this is conclusively **not** a zoneless regression —
it's either a pre-existing bug in `ngx-owl-carousel-o@22.0.0` or an
environment-specific quirk of this headless-Chromium sandbox unrelated to
Angular's change-detection strategy either way. It is called out here rather
than silently ignored, per the task's instructions, but it is **not** a
reason to hold this PR — fixing (or further diagnosing) it is out of scope
for a zoneless-migration change and should be tracked separately.

## Files touched

- `src/main.ts` — zoneless provider.
- `angular.json` — `zone.js` removed from `build` and `test` polyfills.
- `package.json` / `package-lock.json` — `zone.js` dependency removed.
- `src/app/directives/logo-fallback/logo-fallback-background.directive.spec.ts`
  — `fakeAsync`/`flushMicrotasks` replaced with plain `async`/`await`.

No component/directive/service source needed a code change — the earlier
OnPush migration already put the necessary `markForCheck()` calls in place
everywhere they were actually needed, and everything else in the audit
turned out to either go through Angular's own zoneless-safe event pipeline,
write to signals (zoneless-safe by construction), or bypass Angular
bindings entirely (raw DOM writes that were never CD-dependent in the first
place).

## Verification

- **`npx ng build`**: succeeds (only pre-existing Sass `@import` deprecation
  warnings and a pre-existing `header.component.scss` budget warning,
  neither related to this change). Confirmed `zone.js` is actually absent
  from the output, not just uninstalled: `grep` for zone.js's internal
  monkey-patch signatures (`zoneAwareAddEventListener`, `_ZoneDelegate`,
  `ZoneTask`, `__symbol__`) across `dist/v3.yannislam.org/browser/*.js`
  returns nothing, and `index.html` loads a single `main-*.js` module with
  no separate polyfills bundle (there used to be one).
- **`ng test --watch=false`**: not runnable out-of-the-box in this sandbox
  for two *pre-existing, unrelated* reasons — confirmed pre-existing by
  reproducing both on unmodified `origin/main`: (1) the karma target's
  `stylePreprocessorOptions.includePaths` isn't set (only the `build`
  target has it), so `bootstrap-custom.scss`'s relative `@import`s fail to
  resolve; (2) `karma-chrome-launcher`'s default `ChromeHeadless` launcher
  refuses to start as root without `--no-sandbox`. Both were worked around
  **locally, temporarily** (a scratch `karma.conf.js` with a
  `--no-sandbox` custom launcher, passed via `--karma-config`) purely to
  get a real pass/fail signal for this migration — neither workaround is
  part of this diff, since both are pre-existing sandbox/config issues
  unrelated to zoneless and out of scope here. With that workaround: **63
  passed / 6 failed**, and the failures are byte-for-byte identical
  (same test names, same errors — `NG0304` unknown elements, `NG05105`
  missing animations provider, `NG0301` `ngbNav` export not found) whether
  run against this branch or against unmodified `origin/main` with the same
  workaround — i.e. zero regressions attributable to this migration.
- **Interactive verification** (`ng serve` + Playwright, Chromium at
  `/opt/pw-browsers`, headless, `--no-sandbox`): visited `/`, `/projects`,
  `/projects/highschool`, and `/aardeyamz`, reading actual computed
  styles/attributes/DOM state before and after each interaction (not just
  checking for the absence of console errors), plus a `pageerror` listener
  on every page. **14 of 15 checks passed**; the one failure is the
  pre-existing carousel issue documented above, with the A/B proof it's
  unrelated to this migration. What was checked:
  - Loading-screen: overlay is `visibility: visible` on first paint, then
    transitions to `visibility: hidden` within 8s (intro + `MIN_DISPLAY_MS`
    + outro) — confirms `playOutro()`'s `markForCheck()` still fires the
    view update with zone.js gone.
  - Banner: `h3.typing`'s `textContent` changes between two reads 1.5s
    apart — confirms `ngx-typed-js`'s direct-DOM typing effect keeps
    running (it was never CD-dependent, so this is a sanity check that
    nothing broke it).
  - Theme toggle: clicked `.theme-toggle` four times, reading
    `document.documentElement`'s `data-theme` attribute after each click —
    confirmed it cycles `null → "light" → "dark" → null → "light"`
    (`ThemeService.mode` is a signal, read directly in the template;
    signal writes notify Angular's zoneless scheduler by construction).
    Also confirmed the toggle button's icon `class` (Font Awesome glyph)
    tracks the mode each time.
  - Header on scroll: `window.scrollTo(0, 1200)`, then read
    `nav.main-navbar`'s `nav-shadow` class membership and the logo
    `<img>`'s computed `transform` matrix before/after — both changed as
    expected, confirming the `@HostListener('window:scroll')` analysis
    above holds in practice, not just in theory.
  - AOS: scrolled to the bottom of the page and re-read every `[data-aos]`
    element's `aos-animate` class membership — 3 elements gained the class
    that didn't have it before scrolling, confirming the
    `IntersectionObserver`-driven `classList.toggle` still fires and
    (correctly, per the audit above) needs no `markForCheck()` since it was
    never CD-routed.
  - Mobile hamburger drawer: at a 480×900 viewport, clicked
    `.hamburger-menu` and read `.menu-responsive aside`'s `aside-show`
    class membership — confirmed it toggles on and back off across two
    clicks.
  - Namecard hover (`/aardeyamz`): hovered the first `.namecard-box` at a
    1280px-wide viewport and read its computed `width`/`position` before
    and after — confirmed it expands (`257.781px` / `relative` →
    `833.344px` / `absolute`). This is pure CSS `:hover`, entirely
    independent of Angular's change-detection strategy either way; checked
    per the task's list as a sanity pass, not because it was at risk.
  - Workhistory carousel autoplay: see "Known issue" above.
  - All four routes: zero `pageerror` events throughout every check above.
