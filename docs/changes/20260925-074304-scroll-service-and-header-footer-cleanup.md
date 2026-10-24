Date: 2026-09-25 07:43:04

# ScrollService + header/footer cleanup

Second PR out of `docs/todo/code-review-optimization.md`'s suggested
grouping: "#5 scroll performance plus `ScrollService`, and #16 header
cleanups."

## What changed

### New `ScrollService` (`src/app/services/scroll/`)

`HeaderComponent` and `FooterComponent` each had their own
`@HostListener('window:scroll')` that re-read
`document.documentElement.scrollHeight` and `window.innerHeight` — a
forced synchronous layout — on every single scroll event, and each write
marked its OnPush view dirty regardless of whether the value that
mattered had actually changed.

`ScrollService` is a root-provided singleton with:

- `y` — current `window.scrollY`, written from **one** passive
  `window:scroll` listener for the whole page, throttled to at most one
  write per animation frame via `requestAnimationFrame`.
- `maxScroll` — `scrollHeight - innerHeight`, clamped to `>= 0`. This only
  changes on resize or when content height changes, so it's tracked via a
  `resize` listener plus a `ResizeObserver` on `<body>` instead of being
  recomputed on every scroll tick.

Both are plain Angular signals, so consumers derive `computed()`s off
them and only re-render when the derived value changes.

### `HeaderComponent`

- `logoRotationDeg` (was a getter reading live DOM geometry on every
  template read) and a new `hasScrolled` (was the inline
  `this.pageYPosition > 0` template expression) are now `computed()`
  signals derived from `ScrollService`. The component's own
  `getScrollPosition()` `@HostListener` is gone entirely.
- `responsiveMenuVisible` is now a signal, not a plain `Boolean` field.
  `scroll()` flips it back to `false` inside an async
  `router.navigate().then()` callback (navigating home from another route
  before scrolling) — that write happens outside any template event, so
  OnPush's zone-based change detection wasn't picking it up; a signal
  write is what actually re-renders the mobile menu shut in that case.
- `[ngStyle]="{'pointer-events': ...}"` → `[style.pointer-events]`.
- The desktop and mobile nav lists each had two click handlers per item:
  an analytics `(click)` on the `<li>` and the navigation `(click)` on
  the `<a>`. Folded the analytics call into `navigate()` so there's one
  handler, one place — this also means an item without a real link
  target no longer needs its own separate analytics wiring.
- The post-`NavigationEnd` re-run of `setupSectionObserver()` used a bare
  `setTimeout(() => ...)`, timed to happen to outlast the new route's
  render. Replaced with `afterNextRender(..., { injector })`, which ties
  it to the new view having actually rendered instead of an arbitrary
  macrotask delay.

### `FooterComponent`

- `atBottom` is now a `computed()` derived from `ScrollService.y()` and
  `ScrollService.maxScroll()` instead of the component's own
  `window:scroll`/`window:resize` listeners re-deriving the same
  `scrollHeight`/`innerHeight` math on every event. The two values are
  mathematically equivalent
  (`scrollY + innerHeight >= scrollHeight - threshold` ⟺
  `scrollY >= maxScroll - threshold`), so this is a pure refactor with no
  behavior change — same test cases pass unmodified in spirit (rewritten
  against the injected `ScrollService` instead of spying on
  `window`/`document` properties directly).
- `checkScrollPosition()` and its `@HostListener`s are gone; the
  component no longer implements `AfterViewInit` since there's nothing
  left to initialize on mount (the computed signal is reactive from
  construction).

### Not changed here

`LinkPreviewService` (`src/app/services/link-preview/`) also has its own
window scroll listener and could adopt `ScrollService` too, per the
backlog's "Consider a small shared `ScrollService`... that header,
footer, and `LinkPreviewService` all use" note. Left alone in this PR —
it's bundled with that service's own bug fixes (timer leak, hover-intent
delay) in a later PR from the same backlog, and `ScrollService` already
exists for it to adopt there.

## Test plan

- `npm test` — all unit tests pass, including new coverage for
  `ScrollService` and the rewritten `HeaderComponent`/`FooterComponent`
  specs (now driven through an injected/stubbed `ScrollService` instead
  of spying on live `window`/`document` properties).
- `npm run build` succeeds.
