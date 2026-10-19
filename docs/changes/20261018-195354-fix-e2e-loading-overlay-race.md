Date: 2026-10-18 19:53:54

# Fix E2E Loading-Overlay Race

## Problem

`e2e/smoke.spec.ts` ("home page boots") failed intermittently on CI and
locally (~50% of runs here). The e2e config forces `prefers-reduced-motion`,
and under reduced motion `LoadingScreenComponent` keeps the overlay up for only
`REDUCED_MOTION_DISPLAY_MS` (300ms) after hydration. `page.goto('/')` waits for
`load`, so on a slow runner the 300ms window could be over before
`expect(overlay).toBeVisible()` first polled ("Received: hidden" with the
`loading-screen--hidden` class).

## Fix

`page.goto('/', { waitUntil: 'commit' })`. The prerendered HTML ships the
overlay visible, so assertions start from the response's first byte instead of
after `load`. The test's remaining assertions (header mounts, overlay hides,
body scroll restored) are unchanged. No application code changed.

Verified: 12/12 repeated runs pass locally, up from roughly half; the rest of
`smoke.spec.ts` still passes.
