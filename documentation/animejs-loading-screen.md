# Animated Loading Screen

A full-screen loading overlay plays while the app boots: the site's tangram-style
logo mark assembles itself from its individual colored pieces (via
[anime.js](https://animejs.com) v4), then the whole overlay fades away once the
page has actually finished loading.

## Component: `LoadingScreenComponent`

`src/app/components/general/loading-screen/` — declared and exported from
`GeneralModule`, rendered first in `app.component.html` so its `position: fixed`
overlay sits on top of the header/router-outlet/footer regardless of DOM order:

```html
<app-loading-screen></app-loading-screen>
<app-header></app-header>
<router-outlet></router-outlet>
<app-footer></app-footer>
```

### Sequence

1. **Intro** (`playIntro`) — each `<polygon class="logo-piece">` starts scaled
   down, rotated, transparent, and translated outward along the line from the
   artwork's center to that piece's own center (`radialOffset()`, using
   `SVGGraphicsElement.getBBox()`). `animate()` tweens all of them back to
   `translate(0,0) scale(1) rotate(0) opacity(1)` with `stagger(45, { from:
   'center' })` and an `outElastic` ease, so the pieces fly inward and snap into
   the finished mark instead of a plain progress bar.
2. **Breathe** (`playBreathe`) — once assembled, the whole `<g class="loading-screen__logo-group">`
   loops a subtle scale pulse (1 → 1.035, alternating) while the real page
   finishes loading in the background.
3. **Outro** (`playOutro`) — triggered once both a minimum display time
   (`minDisplayMs`, 1400ms — so fast loads don't just flash) and the real
   `window.load` event (or `document.readyState === 'complete'`) have passed.
   Stops the breathe loop, gives the logo group a quick 1.1x settle bounce, then
   fades the overlay's opacity to 0. `hidden` is set afterward (`display: none`
   via `.loading-screen--hidden`) and body scroll (`overflow: hidden` during
   load) is restored.

Each piece animates independently via CSS transform, so `transform-box:
fill-box; transform-origin: center;` is set on `.logo-piece` (and the group) —
without it, scale/rotate pivot around the SVG viewport's origin instead of each
shape's own center.

## Logo: PNG → SVG

The existing `src/assets/images/logos/clearcolor.png` (800×800, transparent) is
a flat raster of ~11 solid-colored triangle/diamond/parallelogram pieces with no
existing vector source. To animate the pieces individually, it was reconstructed
as `src/assets/images/logos/logo.svg` and inlined directly in
`loading-screen.component.html` (needed so `anime.js` can query and transform
each `<polygon>` — an `<img>` can't be manipulated piece-by-piece).

Reconstruction method (all shapes in this mark are convex, so this recovers
exact vertices rather than an approximation):

1. Load the PNG with Pillow/NumPy, take opaque pixels (`alpha > 200`), and find
   the significant fill colors (pixel count > 200, to drop anti-aliasing noise)
   — this found the 8 distinct fill colors.
2. Some colors are reused by more than one disconnected piece (e.g. both "arm"
   triangles and the right "leg" share the same orange), so each color's pixel
   mask was split into connected components with `scipy.ndimage.label`.
3. Each component's convex hull (`scipy.spatial.ConvexHull`) gives that piece's
   exact vertices in the image's pixel/user-unit space — which map directly to
   an SVG `viewBox="0 0 800 800"`.
4. Hull output has extra near-duplicate/collinear points from anti-aliased
   edges; a small simplification pass merges points closer than 4px and drops
   points whose perpendicular distance from the line through their neighbors is
   under 6px, leaving clean 3–4 point polygons.

This produced 11 `<polygon>` pieces (2 yellow spikes, 1 gray cap, 2 orange arms,
1 red diamond, 1 lime leg, 1 orange leg, 1 green foot, 1 orange foot, 1 cream
foot) that render pixel-equivalent to the original PNG.

## Dependency

`animejs` (`^4.5.0`) was added to `dependencies`. Its `.d.ts` files reference
`NodeJS.Timeout`/`NodeJS.Immediate`, which the app's `tsconfig.app.json`
couldn't see because it restricts `types` to `["@angular/localize"]` — `@types/node`
was added as a devDependency and `"node"` added to that `types` array to fix
the build.

## Verification

- `ng build` — clean, no TypeScript errors.
- `ng serve` + headless Chrome screenshots: confirmed the overlay renders with
  pieces visibly mid-flight (offset from final position, motion-blurred) shortly
  after load, and that the overlay fades away to reveal the actual homepage
  underneath once loading completes.

## Files touched

- `src/app/components/general/loading-screen/` — new component
  (`.ts`/`.html`/`.scss`).
- `src/app/components/general/general.module.ts` — declares/exports
  `LoadingScreenComponent`.
- `src/app/app.component.html` — renders `<app-loading-screen>`.
- `src/assets/images/logos/logo.svg` — new hand-reconstructed vector version of
  `clearcolor.png`.
- `package.json` / `package-lock.json` — added `animejs`, `@types/node`.
- `tsconfig.app.json` — added `"node"` to `compilerOptions.types`.
