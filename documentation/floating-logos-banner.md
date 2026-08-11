# Floating Logos Background (Banner)

> **Follow-up:** the component now supports multiple background animations and
> picks one per load — see `documentation/floating-logos-modes.md`. The falling
> animation described here is currently commented out of the rotation for
> testing, but its code and tests are untouched.

A field of small, tangram-mark logos continuously falls behind the banner's
"Hello! My name is" greeting — random colors, sizes, and fall speeds, never
overlapping each other, dodging away from the cursor on hover, and
reshuffling to new colors whenever the theme is toggled. Built iteratively
over one conversation; this doc walks through each round in order, since the
early attempts (full-page overlay, one-shot drop animation, instant-jump
dodge) were all deliberately replaced based on feedback, not refactored in
place.

## Component: `FloatingLogosComponent`

`src/app/components/home/floating-logos/` — declared in `HomeModule`,
rendered as the first child inside `<section class="section banner"
id="banner">` in `banner.component.html`. `.banner` was given `position:
relative` so the component's `position: absolute; inset: 0` host fills
exactly that section's box, not the viewport.

## 1. New logo colors

`src/assets/images/logos/clearcolor.svg` already existed (11 flat-colored
`<polygon>` pieces — see `documentation/animejs-loading-screen.md`), alongside
single-flat-color `black.svg`/`gray.svg`/`white.svg` variants used for the
theme-matched header logo. The distinct fill colors used across
`clearcolor.svg`'s pieces became new single-color logo files, one flat color
per file, same pattern as the existing black/gray/white:

| File | Hex |
| --- | --- |
| `yellow.svg` | `#fff200` |
| `gold.svg` | `#ffc90e` |
| `red.svg` | `#ed1c24` |
| `lime.svg` | `#b5e61d` |
| `green.svg` | `#22b14c` |
| `orange.svg` | `#ff7f27` |
| `cream.svg` | `#efe4b0` |

`clearcolor.svg`'s cap piece (`#7f7f7f`) was skipped — it's a 1-unit-per-channel
difference from the existing `gray.svg` (`#808080`), visually identical.

## 2. First pass: full-page overlay, one-shot drop, animejs tweens

The initial version rendered site-wide: `<app-floating-logos>` in
`app.component.html` (declared in `GeneralModule`), host `position: fixed;
inset: 0`, 14 logos with random size/position, animated in once via
`animejs`'s `animate()` with an `outBounce` ease (mirroring the pattern
already used in `LoadingScreenComponent`), then static except for a
mouseenter handler that tweened the hovered logo away and back with a second
`animate()` call.

Verified with `ng build` + a headless-Chromium (Playwright) script driving
`ng serve`: screenshots confirmed small, low-opacity logos scattered over the
hero section, and a hit-testing pass (`document.elementFromPoint` at each
logo's center) confirmed they were actually clickable/hoverable, not just
painted — that surfaced a real bug: at `z-index: 1`, logos landing inside the
header's own strip lost the hit-test to the header nav (`z-index: 9`), which
was the *correct* outcome (header must stay clickable above decorative
content) once confirmed with a controlled batch of fresh loads.

## 3. Continuous falling + guaranteed no-overlap + 100 logos

Next ask: make the logos *keep* falling (not a one-shot drop that then sits
still), guarantee no two ever stack, and raise the count to 100. A real-time
physics simulation with per-frame pairwise collision resolution was
considered and rejected — at 100 fast-moving objects with independent random
speeds, soft repulsion can only ever *reduce* overlap probability, not
guarantee zero. Instead, non-overlap was made a structural property of the
layout:

- The container width is divided into fixed-width vertical **lanes**
  (`LANE_WIDTH_PX`); logos are distributed round-robin across lanes, so
  different lanes can never share an x-range.
- Within a lane, logo-mates are evenly spaced (`phase = k * step`, no
  jitter) along a looping vertical **track** (`trackLength`) and all move at
  the *same* lane speed. Identical speed + fixed phase spacing means the gap
  between consecutive lane-mates never changes — nothing can catch up to and
  overlap the item ahead of it, including through the wraparound at the
  bottom of the loop, since the modulo arithmetic preserves spacing exactly.

This replaced the animejs one-shot tween with a hand-rolled
`requestAnimationFrame` loop that computes each logo's `translate3d(...)
rotate(...)` directly from `phase + speed * elapsedSeconds` and writes
`el.style.transform` straight to the DOM — bypassing Angular change detection
per frame, since binding 100 elements' transforms through template
expressions every frame would fight the imperative writes on every CD tick.

**Bug found via automated overlap checking:** an initial pairwise
bounding-box check (`getBoundingClientRect()` on every logo, every few
hundred ms, across several fresh loads) found 3 apparent overlaps. Actual
cause: `getBoundingClientRect()` on a *rotated* square returns its
axis-aligned bounding box, which is wider than the unrotated size — up to
`size * (cos θ + sin θ)` of the rotation angle. Lanes had been sized for the
raw `MAX_SIZE_PX`, not the worst-case rotated footprint, so two max-size,
max-rotated neighbors' inflated boxes could brush. Fixed by computing
`ROT_INFLATE = cos(25°) + sin(25°)` once and sizing `LANE_WIDTH_PX` /
`VERTICAL_SPACING_PX` off `MAX_SIZE_PX * ROT_INFLATE` instead of the raw
size — re-ran the same check afterward: 0 overlaps across 100 logos over
multiple time samples.

## 4. Smoother hover-dodge

Feedback: the hover dodge "jumps too far." The original dodge set the
displacement once (an instant jump to the full 80–150px offset in a single
frame) and only eased the *return* to rest. Replaced with a target-pursuit
model: `onDodge` sets a `dodgeTarget{X,Y}` away from the cursor; every frame,
the *target* decays toward zero (`DODGE_TARGET_DECAY`) and the *rendered*
position eases toward that decaying target (`DODGE_APPROACH`) — so both the
outward nudge and the return are gradual, never an instant snap. Distance was
also shrunk (30–60px, capped at 90px, down from 80–150px capped at 180px).

Verified by sampling the computed `transform` on ~50ms intervals right after
a synthetic hover: displacement ramped up smoothly (≈25px → 32px → 35px
peak) instead of jumping straight to its maximum in one step.

## 5. Scoped down to just the banner section

Feedback: "too much going on" — because the layer was `position: fixed`, it
followed the viewport down through *every* section of the page while
scrolling, not just the hero. Moved the component from `GeneralModule` /
`app.component.html` to `HomeModule` / `banner.component.html`, changed the
host to `position: absolute` sized to `.banner`'s own box (reading the host's
`getBoundingClientRect()` instead of `window.innerWidth/innerHeight` for lane
math), and dropped the count from 100 to a fixed 24 (see §7 for the later
change to a random range). Verified: logos stay within `#banner`'s bounding
box and are no longer present in the viewport once scrolled past that
section.

## 6. Recolor on theme change

Ask: reshuffle every logo's color when the user toggles the site theme.
`ThemeService.mode` is a signal, so the component takes `ThemeService` in its
constructor and registers an `effect(() => { this.themeService.mode(); ...
})`. Since Angular effects fire once immediately on creation (redundant here,
as `generateLogos()` already randomizes initial colors), a one-shot
`isFirstThemeCheck` flag skips that first firing. Each subsequent firing
calls `reshuffleColors()`, which reassigns every logo's `variant` to a color
guaranteed different from its current one (so the change always reads as
visible, not a coin flip that might reuse the same color).

Verified by scripting two consecutive clicks on the header's `.theme-toggle`
button and diffing each logo's `src` before/after: 24/24 changed on both
toggles.

## 7. Randomized logo count

Final ask: instead of a fixed count, spawn a random number of logos between
20 and 40 each load. `generateLogos()` now rolls
`Math.round(MIN_LOGO_COUNT + Math.random() * (MAX_LOGO_COUNT -
MIN_LOGO_COUNT))` once per component instance. Verified across 6 fresh page
loads (counts observed: 27, 23, 22, 37, 23, 20) with the overlap check still
passing at 0 on every run.

## Key constants (`floating-logos.component.ts`)

| Constant | Value | Purpose |
| --- | --- | --- |
| `MIN_LOGO_COUNT` / `MAX_LOGO_COUNT` | 20 / 40 | Random logo count per load |
| `MIN_SIZE_PX` / `MAX_SIZE_PX` | 22 / 48 | Random logo size |
| `ROT_MAX_DEG` | 25 | Max tilt; also bounds the AABB-inflation math |
| `LANE_GAP_PX` | 14 | Minimum gap between lanes/track positions |
| `MIN_SPEED_PX_S` / `MAX_SPEED_PX_S` | 18 / 55 | Random fall speed per lane |
| `DODGE_DISTANCE_MIN_PX` / `MAX_PX` | 30 / 60 | Hover-dodge target distance |
| `DODGE_MAX_PX` | 90 | Clamp on accumulated dodge target |
| `DODGE_APPROACH` | 0.12 | Per-frame ease-toward-target rate |
| `DODGE_TARGET_DECAY` | 0.94 | Per-frame decay of the dodge target itself |

Also respects `prefers-reduced-motion`: falls back to a single static render
at each logo's phase position, with the fall loop and hover-dodge both
disabled.

## Verification method

No `chromium-cli` in this Windows environment, so verification throughout
used `ng build` (compile check) + `ng serve` + a Playwright script (already
cached locally from a prior install) driving headless Chromium — screenshots
for visual review, plus scripted DOM queries (`getBoundingClientRect`,
`getComputedStyle().transform`, `document.elementFromPoint`) for the
non-overlap, motion, dodge-smoothness, scroll-scoping, and theme-reshuffle
checks described in each section above.

## Files touched

- `src/app/components/home/floating-logos/` — the component
  (`.ts`/`.html`/`.scss`); originally created under
  `src/app/components/general/floating-logos/` in §2–4, then moved here in
  §5.
- `src/app/components/home/banner/banner.component.html` — renders
  `<app-floating-logos>`.
- `src/app/components/home/banner/banner.component.scss` — `.banner` given
  `position: relative`.
- `src/app/components/home/home.module.ts` — declares
  `FloatingLogosComponent`.
- `src/assets/images/logos/{yellow,gold,red,lime,green,orange,cream}.svg` —
  new flat-color logo variants (§1).
- `documentation/floating-logos-banner.md` — this file.
