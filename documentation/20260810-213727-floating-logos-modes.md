Date: 2026-08-10 21:37:27

# Background Animation Modes (Banner)

`FloatingLogosComponent` used to do exactly one thing: rain little YL logos
down the banner (see `documentation/20260729-090717-floating-logos-banner.md`
for how that was built). It now picks a **mode** per page load, so more
background animations can be added without another component or a rewrite of
this one. The first new mode is `mosaic`: instead of falling, the little logos
are scattered inside the outline of the YL mark, so the crowd reads as one big
YL.

## Current state: falling is temporarily off

```ts
const ENABLED_MODES: readonly BackgroundMode[] = [
  // TEMP (testing the mosaic): the original falling animation is commented
  // out so every load shows the new one. Un-comment this line to put it back
  // in the rotation.
  // 'falling',
  'mosaic'
];
```

The mode is drawn at random from `ENABLED_MODES` in the component's field
initializer. Commenting an entry out disables that animation without deleting
any of its code, which is how the falling animation is currently parked — the
lane math, sway, and its `MODE_CONFIG` entry are all still there and still
tested. Un-comment `'falling'` to get both, one at random per load.

## Adding a mode

1. Add the name to the `BackgroundMode` union.
2. Add its per-load randomization ranges to `MODE_CONFIG` (count, size,
   opacity, max rotation). `generateLogos()` reads them generically, so this is
   all that's needed for the logos themselves to exist.
3. Add a `case` to `layout()` for a layout pass (runs on `ngAfterViewInit` and,
   debounced, on resize) and a `case` to `restPosition()` for per-frame motion.
   Both `switch` on `this.mode` and are exhaustive over the union, so the
   compiler points at anything left unimplemented.
4. Add the name to `ENABLED_MODES`.

Everything else — the rAF loop, the pause-on-hidden handling, the hover dodge,
the theme-change recolor, and `prefers-reduced-motion` — is mode-agnostic and
comes for free.

## Mode: `mosaic`

### The stencil (`yl-shape.ts`)

The eleven `<polygon>` point lists from `src/assets/images/logos/clearcolor.svg`
are copied verbatim into `PIECES`, so the stencil lives in that file's 800x800
viewBox space ("shape units"). Nothing in this file knows about pixels.

- `YL_SHAPE_BOUNDS` — the tight box around the inked pieces, `287,80` to
  `601,731` (314 x 651 units), *not* the 800x800 canvas.
- `isInsideYlShape(x, y)` — true if the point lands on any piece. Ray casting
  per polygon, because several pieces (the arms, the legs) are concave, where a
  convex-only test or a triangle fan would sample outside the mark.
- `packPointsInYlShape(radii, options?)` — one point per entry of `radii`,
  index-aligned.

The packing is dart throwing with progressive relaxation, not an exact
packing. Candidates come from rejection sampling against the bounding box (the
pieces cover ~28% of it, so ~4 tries per hit); the largest items are placed
first since they're hardest to fit; and an item that can't find room at least
`rᵢ + rⱼ` from its neighbors after 60 darts settles for a looser requirement
rather than being dropped. **Every item always gets a position** — a slightly
tight cluster is far less visible than a hole in the silhouette, and the
component indexes the result array directly. `options.random` is injectable so
the tests can assert exact spacing without flaking.

### Layout

`mosaicPlacement(width, height)` is a pure exported function mapping the mark
into the host box — `scale` (host px per shape unit) plus the top-left of the
scaled mark — and the spec uses it rather than re-deriving the constants.

The mark is tall and narrow, so it's scaled to `MOSAIC_FILL` (0.72) of the host
height. On hosts at least `MOSAIC_WIDE_HOST_PX` (992px) wide it's parked at 72%
of the width, i.e. to the right of the banner copy (left-aligned, capped at
500px) rather than on top of it. Narrower than that there's nowhere to hide, so
it centers and `centered: true` comes back — `layoutMosaic` then sets a group
opacity of `MOSAIC_CENTERED_DIM` (0.4) on the layer `<div>`, which multiplies
with each logo's own opacity and keeps the copy readable. Group opacity is used
rather than per-logo values so it also covers logos that already faded in, and
so resizing across the breakpoint doesn't restart the entrance.

`layoutMosaic` converts each logo's keep-apart radius into shape units
(`size / 2 * MOSAIC_PACK / scale`), packs the points, then maps them back into
host pixels, biasing by half a logo because `translate3d()` moves an element's
top-left and the sampled point should land on its center. `MOSAIC_PACK` (0.55)
is well under half the logo's box on purpose: each logo inks maybe a fifth of
its own square (it's a thin figure on transparent ground), so packing on the
full half-size leaves the shape looking gappy.

### Motion

- **Entrance** — each logo has a random `appearAt` within
  `MOSAIC_ENTRANCE_STAGGER_S` (1.6s) and fades in over 0.7s with an
  easeOutCubic, scaling up from 0.4, so the shape assembles itself on load.
  Both are written imperatively from the rAF loop (the template binds
  `initialOpacity`, which is 0 in this mode) rather than as a CSS animation,
  since a keyframe on `transform`/`opacity` would fight the loop's own inline
  writes.
- **Idle** — a slow elliptical orbit around the anchor (2–7px at 0.04–0.14Hz),
  so a finished mosaic breathes instead of freezing.
- **Hover dodge** — unchanged and shared with falling mode.

### Density and cost

Counts are much higher than falling mode's 20–40 (180–240) for the same
ink-coverage reason as `MOSAIC_PACK`: at ~100 logos the silhouette measured as
a faint scatter rather than a YL, in the light theme especially. Two things pay
for the extra elements:

- The per-logo `drop-shadow` is dropped in this mode (`:host(.mode-mosaic)` in
  the `.scss`) — at this size and count it stops reading as depth and just
  costs a filter pass per element per frame.
- `render()` skips writing a `transform` that rounds to the same string as the
  last one. Measured on a settled 202-logo desktop mosaic: ~99 writes per frame
  instead of 202.

Measured at 60fps in headless Chromium at 1440x900 with 232 logos.

## Prerendering / hydration

The SSR work in `documentation/20260811-013939-ssr-prerendering.md` landed
alongside this, and mode dispatch sits behind the same browser gate everything
else here does:

- `layout()` (both modes) and the rAF loop are inside `ngAfterViewInit`'s
  `if (!this.isBrowser) return;`, since `getBoundingClientRect()` doesn't exist
  under Domino. The server therefore renders the logo elements with no
  transform at all.
- The synchronous `render(0)` after `layout()` covers both modes. Falling mode
  needs it to avoid a visible pile at (0,0) on the first paint; mosaic logos
  are transparent until their entrance starts, so for them it's what puts them
  in the right place to fade in *from*.

**Known wart (pre-existing, now bigger).** `generateLogos()` runs on the server
too, so the prerendered HTML contains a full set of logo elements — and since
count, colors, sizes and positions are all random per instance, the hydrating
client generates a different set. Hydration silently discards the prerendered
elements and re-creates them: harmless (verified below — no errors, no flash,
correct first frame), but it means ~200 decorative `<img>` tags, roughly 20KB,
are shipped in every prerendered page's HTML only to be thrown away. Falling
mode had the same mismatch at 20–40 elements; mosaic scales it up ~6x.

The idiomatic fix is to render nothing on the server *and* nothing on the
client's initial (hydrating) render, then create the layer from
`afterNextRender()` — the two sides agree, the mismatch disappears, and the
HTML gets smaller. That's deliberately not done here: it changes this
component's hydration behavior, which the SSR work was actively stabilizing at
the time (boot animation, first-paint flash), and it belongs in its own change
rather than riding along with a background animation.

## Verification

`ng build` + `ng test` (133 specs), plus Playwright against `ng serve` driving
headless Chromium:

- Silhouette read from a coarse grid of logo centers and from screenshots, in
  light and dark themes, at 1440x900 and 420x820.
- Placement: desktop extent x 750–1079 of a 1272px-wide host (parked right);
  mobile centered and dimmed.
- Theme toggle recolored 182/182 logos.
- Hover dodge ramps smoothly (14.7px over 150ms), not a jump.
- `prefers-reduced-motion`: positioned, fully visible, and byte-identical
  across a 1.2s gap — no entrance, no loop.
- Falling mode re-enabled temporarily and re-checked for regressions after the
  refactor: 33 logos, all moving, 0 overlaps across 5 time samples, opacity
  0.17–0.38.

After merging the SSR work, re-verified against the *real* prerendered output
(`dist/v3.yannislam.org/browser` served statically, so the client bundle
actually hydrates a prerendered page — something `ng serve` can never
exercise), across 3 fresh loads: no hydration or `NG0xxx` console errors, 0
logos piled at the origin on the first rendered frame, and every logo visible
and correctly placed once settled (201/210/212 logos, ~300px x-spread). The
only console noise is this sandbox's proxy blocking `gtag`/fonts. The mosaic's
prerendered-page screenshot matches the `ng serve` one.

## Known interaction (pre-existing)

The layer is `position: absolute; z-index: 1` inside `.banner`, so it paints
*above* the hero copy, and `.floating-logo` keeps `pointer-events: auto` for the
dodge. That was already true of the falling animation; it's just more visible
now that the mosaic is denser and larger. Moving the layer behind the text would
mean a negative `z-index` (a `z-index: 0` positioned element still paints over
in-flow inline content) and would give up the hover dodge wherever the copy's
boxes overlap the mark, so it was left alone.

## Files touched

- `src/app/components/home/floating-logos/yl-shape.ts` (+ `.spec.ts`) — the
  stencil and the packing.
- `src/app/components/home/floating-logos/floating-logos.component.ts` — mode
  selection, `MODE_CONFIG`, `mosaicPlacement`, `layoutMosaic`, mode-dispatched
  `layout()`/`restPosition()`, entrance easing, redundant-write skip.
- `floating-logos.component.html` — `#layer` ref for the group opacity, binds
  `initialOpacity`.
- `floating-logos.component.scss` — `:host(.mode-mosaic)` shadow opt-out.
- `floating-logos.component.spec.ts` — assertions now read the active mode's
  config instead of hardcoded falling-mode numbers.
