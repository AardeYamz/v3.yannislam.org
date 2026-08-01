# Pause floating logos when the tab is backgrounded

## Context

`FloatingLogosComponent` (see `documentation/floating-logos-banner.md`)
drives 20-40 falling logos with a hand-rolled `requestAnimationFrame` loop
started in `ngAfterViewInit`. It already skips the loop entirely under
`prefers-reduced-motion`, but had no awareness of tab visibility — the rAF
loop kept running (and repainting every frame) even while the tab was
backgrounded, burning CPU/battery for an animation nobody could see.

## Change

Added a `visibilitychange` listener that cancels the rAF loop when
`document.hidden` becomes `true` and restarts it when it becomes `false`
again, mirroring the existing `resize` listener's setup/teardown pattern
(guarded by the same `typeof window === 'undefined'` check already used for
SSR-safety elsewhere in the component — no new browser-only machinery was
introduced).

The loop-start logic (previously inlined in `ngAfterViewInit`) was factored
out into `startLoop()` / `stopLoop()` so both the initial start and the
visibility-driven resume/pause share one implementation:

- `startLoop()` anchors its local `start` timestamp as `performance.now() -
  this.elapsedS * 1000` rather than always `performance.now()`. Since
  `render()` computes each logo's position from `now - start`, this means a
  resume continues from `this.elapsedS` (the elapsed time already
  accumulated before the pause) instead of resetting to 0 — logos pick up
  exactly where they left off rather than jumping back to their track's
  start position. Elapsed time during the paused/hidden interval is not
  counted, since no rAF callbacks (and therefore no `render()` calls) occur
  while paused.
- `stopLoop()` cancels the current `rafId` and clears it to `undefined`.
- `onVisibilityChange` is a no-op under `prefersReducedMotion`: reduced
  motion never starts a loop in the first place (`ngAfterViewInit` calls
  `render(0)` once and returns), so there is nothing to pause or resume.

`ngOnDestroy` now also removes the `visibilitychange` listener, alongside
the existing `resize` cleanup.

## Files touched

- `src/app/components/home/floating-logos/floating-logos.component.ts` —
  `startLoop()`/`stopLoop()` extraction, `onVisibilityChange` handler,
  listener registration in `ngAfterViewInit` and cleanup in `ngOnDestroy`.
- `documentation/pause-floating-logos-visibility.md` — this file.

## Verification

- `ng build` — no TypeScript errors (pre-existing sass `@import` deprecation
  warnings and a header-component CSS budget warning are unrelated to this
  change).
- `ng serve` + a Playwright script driving headless Chromium (browser
  pre-installed in this environment; `playwright-core` installed
  standalone since the repo has no Playwright devDependency):
  - Sampled a floating logo's computed `transform` twice, ~400ms apart, on
    page load: confirmed it changed (animation running).
  - Stubbed `document.hidden`/`visibilityState` to simulate a backgrounded
    tab and dispatched `visibilitychange`; sampled `transform` twice more:
    confirmed it stayed identical (loop paused, no frames rendered).
  - Reverted the stub to simulate the tab becoming visible again and
    dispatched `visibilitychange`; sampled `transform` twice more:
    confirmed it changed again (loop resumed) with no discontinuous jump
    between the last pre-hide position and the first post-resume position.
  - Checked the browser console throughout: no JS errors or warnings
    attributable to this change (only pre-existing `net::ERR_TUNNEL_
    CONNECTION_FAILED` messages from external resources blocked by this
    sandbox's network proxy, unrelated to the component).
