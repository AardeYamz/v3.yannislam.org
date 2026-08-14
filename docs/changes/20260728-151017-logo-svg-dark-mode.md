Date: 2026-07-28 15:10:17

# Logo → SVG conversion + 3-state color theme toggle

## Context

The site's logo lived only as raster PNGs (`clearcolor.png`, `black.png`,
`white.png`, `gray.png`, `clearcolorfull.png` in
`src/assets/images/logos/`), except for one hand-reconstructed vector,
`logo.svg`, built for the anime.js loading-screen animation (see
`docs/changes/20260728-132036-animejs-loading-screen.md`). The goal of this change is
two-fold:

1. Replace every raster logo variant with SVG (reusing the already-solved
   vector geometry in `logo.svg`), update all references, and remove the old
   PNGs.
2. Turn the header logo into a 3-state color-theme toggle (default → light →
   dark → default), swapping in the black/white logo variants per state, and
   introduce light/dark palettes derived from the current navy/orange theme —
   without a full per-component rewrite.

## Logo → SVG

`logo.svg` (`viewBox="0 0 800 800"`) is 11 convex `<polygon>` pieces, each
with its own hard-coded `fill`. Visual comparison of the PNGs confirms
`black.png`, `white.png`, and `gray.png` are **the exact same geometry** as
`clearcolor.png`/`logo.svg`, just flat single-color silhouettes — so they can
be produced by copying `logo.svg`'s 11 `<polygon points="...">` and setting
one shared `fill` per file, no image reprocessing needed.

`clearcolorfull.png` is a **different, longer mark** (extra diamonds/legs
below the section `logo.svg` covers) and is not referenced anywhere in
source (dead asset). Rebuilding it faithfully would need a fresh
PNG→polygon reconstruction pass (no Python image-processing deps are
installed in this environment to do that precisely). Since it's unused,
it's being retired rather than reconstructed — deleted along with the other
old PNGs, not carried forward as an SVG.

Resulting files in `src/assets/images/logos/`:
- `clearcolor.svg` — renamed from `logo.svg`, full-color, default-theme logo.
- `black.svg` — new, solid-black silhouette, used as the light-theme logo.
- `white.svg` — new, solid-white silhouette, used as the dark-theme logo.
- `gray.svg` — new, solid-gray silhouette, kept for parity (not wired into
  the UI, mirrors the unused `gray.png` it replaces).
- Delete: `clearcolor.png`, `black.png`, `white.png`, `gray.png`,
  `clearcolorfull.png`.

Code references to update:
- `src/app/components/general/header/header.component.html:4` — swap
  `assets/images/logos/clearcolor.png` for a theme-driven SVG src (see
  below).
- `src/assets/config.json` — `manifestIcon` field updated to
  `clearcolor.svg`.
- `src/app/components/general/loading-screen/loading-screen.component.html`
  already inlines the polygons directly (not a file reference) — no change
  needed, but its `.md` doc gets a note that `logo.svg` was renamed to
  `clearcolor.svg`.

## Theme system

No dark-mode infrastructure exists today — colors are plain SCSS variables
(`src/variables.scss`, `$Navy`, `$Orange`, etc.), compiled statically into
every component's CSS, so they can't be swapped at runtime as-is.

**Approach — minimal diff:** turn each SCSS variable into a thin alias for a
CSS custom property, and define the three palettes as custom-property
overrides keyed off a `data-theme` attribute on `<html>`. Component `.scss`
files keep using `$Navy`, `$Orange`, etc. unchanged — only
`src/variables.scss` and a new root stylesheet change.

`src/variables.scss` becomes:
```scss
$Navy: var(--color-navy);
$LightNavy: var(--color-light-navy);
$LightestNavy: var(--color-lightest-navy);
$Slate: var(--color-slate);
$LightSlate: var(--color-light-slate);
$LightestSlate: var(--color-lightest-slate);
$White: var(--color-white);
$Orange: var(--color-orange);
$OrangeOpacity: var(--color-orange-opacity);
```

New `src/theme.scss` (imported first in `styles.scss`) defines the 3
palettes. Default (no `data-theme` attribute) keeps today's exact values
unchanged; `[data-theme="light"]` and `[data-theme="dark"]` override them.
Orange and white stay anchored as accent/emphasis colors in every mode, per
the request, just re-tuned for contrast:

| token | Default (current) | Light | Dark (darker than current) |
|---|---|---|---|
| `--color-navy` (bg) | `#131f31` | `#f4f1ea` | `#05070c` |
| `--color-light-navy` | `#112240` | `#ffffff` | `#0a0e18` |
| `--color-lightest-navy` | `#303c55` | `#e4ded2` | `#1c2740` |
| `--color-slate` | `#8892b0` | `#6b6255` | `#6b7590` |
| `--color-light-slate` | `#a8b2d1` | `#4a4238` | `#93a0bd` |
| `--color-lightest-slate` | `#ccd6f6` | `#1f1a12` | `#d7e0f5` |
| `--color-white` (emphasis text) | `#e6f1ff` | `#131108` | `#f7f9fc` |
| `--color-orange` (accent) | `#ffa500` | `#d9720c` | `#ffb020` |
| `--color-orange-opacity` | `rgba(255,165,0,.07)` | `rgba(217,114,12,.08)` | `rgba(255,176,32,.09)` |
| `--name-gradient` (banner `<h2>` text) | `linear-gradient(90deg, #fff200, #ffc90e, #ff7f27)` (gold) | `linear-gradient(90deg, #5c5c5c, #9c1f0f, #5c1010)` (gray/red) | `linear-gradient(90deg, #ff7f27, #ff3d1a, #ed1c24)` (flame) |

(Also fixes `$OrangeOpacity`, which was a leftover `rgba(100,255,218,.07)` —
a teal, not orange — from the template this was based on.)

`banner.component.scss`'s `<h2>Yannis Lam;</h2>` uses a `background-clip:
text` gradient that was hard-coded (`#eeff41 → #f9a825 → #ff5722`), not a
`$Orange`/`$White` variable, so it didn't move when the rest of the page
retheme'd. It's now `--name-gradient`, a token of its own, given a distinct
value per mode, all sourced straight from `clearcolor.svg`'s own fill
colors rather than arbitrary hex:

- **Default**: `#fff200 → #ffc90e → #ff7f27` — the logo's spike-yellow,
  arm-amber, and foot-orange pieces, unaltered, against the dark navy bg.
- **Light**: an initial fix darkened the default gradient uniformly
  (`#8a6600 → #c2540c → #9c1f0f`) for contrast against the light
  background, but a dark, desaturated-looking yellow reads as muddy brown
  — an unavoidable side effect of darkening that specific hue, not a
  one-off tuning miss. Revised to drop yellow from this variant entirely
  and stay in the logo's orange/red range instead — `#e35d00 → #cc3300 →
  #9c1f0f`, from the foot-orange (`#ff7f27`) and diamond-red (`#ed1c24`)
  pieces, darkened but kept fully saturated. That fixed the mud problem,
  but once dark mode was also moved into the orange/red family (below),
  light and dark ended up reading as near-identical too. Tried green next
  (`#1a7a34 → #2f9e4f → #6b8f1a`, from the logo's foot-green `#22b14c` and
  lime leg `#b5e61d`), then per user request moved to gray/red instead —
  `#5c5c5c → #9c1f0f → #5c1010`, from the logo's cap piece (gray
  `#7f7f7f`) and diamond (red `#ed1c24`), darkened for contrast. Starting
  neutral/cool rather than warm and saturated keeps it from reading as a
  shade of the other two, at ~6.0–12.3:1 contrast against `#f4f1ea`.
- **Dark**: originally left unset (silently inherited the default value),
  which read as "the name's color didn't change" even though the rest of
  the page retheme'd — every mode needs its own explicit value for the
  toggle to visibly register here too. A first pass used `#fff200 →
  #ff7f27 → #ed1c24` (yellow spike through to red diamond), but on short
  text like "Yannis Lam;" the shared `#fff200` start with the default
  gradient made the two read as barely different at a glance. Revised to
  drop yellow from this variant too and run a fiery orange→red instead —
  `#ff7f27 → #ff3d1a → #ed1c24` — so default reads as gold and dark reads
  as flame, clearly two different colors even on short text.

`ThemeService` (`src/app/services/theme/theme.service.ts`, new,
`providedIn: 'root'`):
- Holds current mode as a signal, `'default' | 'light' | 'dark'`.
- `cycle()` advances default → light → dark → default, and is the only
  place that writes to `localStorage` (`yl-theme-mode`) — persistence only
  happens on an explicit user action.
- On any mode change (explicit or system-driven): sets/removes `data-theme`
  on `document.documentElement`.
- No SSR in this project (`angular.json` build target is browser-only), so
  no platform guards needed.

### System color-scheme preference

On first visit (nothing in `localStorage` yet), the initial mode is
resolved from `window.matchMedia('(prefers-color-scheme: light)')` instead
of always starting at `default`: OS-light → app `light`; OS-dark or
no-preference → app `default` (it's already a dark theme, so it's the
natural counterpart — there's no separate signal for the deepest `dark`
mode, which stays toggle-only). A `change` listener on that same media
query keeps following the OS setting live — e.g. macOS flipping into dark
mode while the tab is open — for as long as `localStorage` has no stored
key. The moment the user clicks the logo once, `cycle()` writes a value to
`localStorage`, and from then on that explicit choice wins over the OS
setting permanently (checked on every `change` event, not just at load).

## Scroll-rotation

The header logo also spins as you scroll: `HeaderComponent` already tracks
scroll offset (`pageYPosition`, via an existing `@HostListener('window:scroll')`
used for the nav shadow), so a `logoRotationDeg` getter reuses it —
`Math.min(pageYPosition / 900, 1) * 360` — bound to the `<img>` via
`[style.transform]="'rotate(' + logoRotationDeg + 'deg)'"`. It completes
exactly **one** full turn over the first ~900px of scroll and then holds
at 360° (visually identical to 0°) for the rest of the page — an earlier
version scaled rotation linearly for the whole scroll depth (multiple
spins over a long page), which read as tacky per user feedback, so it's
capped to a single turn instead. No CSS transition on the `<img>` itself,
so the rotation tracks scroll position directly rather than lagging behind
it.

## Logo as home link + separate toggle button

An earlier version made the logo itself the click target for
`cycle()`, dropping its home-navigation behavior. Per user request that's
reverted: `header.component.html`'s `<a class="navbar-brand"
[routerLink]="'/'">` stays a home link (`<img [src]="'assets/images/logos/'
+ themeService.logoVariant() + '.svg'">` inside it), and a separate
`<button class="theme-toggle" (click)="toggleTheme()">` sits to its right,
grouped with the nav links inside a new `.nav-right` flex wrapper so it
lands at the right edge of the nav on both desktop and mobile (next to the
hamburger). The logo still visually reflects the theme (`logoVariant()` →
`clearcolor` / `black` / `white`) and still rotates on scroll — only the
click behavior moved off of it.

The toggle button's icon reflects the current mode via Font Awesome (already
a project dependency): `fa-circle-half-stroke` (default), `fa-sun` (light),
`fa-moon` (dark).

`header.component.scss`: replaced the old `.logo-toggle` button-reset rules
with a plain hover/focus opacity affordance on `.navbar-brand` (a scale
transform would conflict with the scroll-rotation, which is set via inline
`style.transform` and always wins over a CSS rule for the same property),
plus new `.nav-right` (flex row, small gap) and `.theme-toggle` (circular
icon button, same orange hover/focus treatment as the rest of the nav,
46×46px / 20px icon — sized up generally per user request) rules.

Below 827px the nav links are hidden (existing `nav .nav` rule), so
`.nav-right` shows only the toggle button — by default that left the
toggle looking centered (space-between across brand/toggle/hamburger) with
the logo pinned left. Per user request, mobile now centers the logo
instead: `.navbar-brand` is pulled out of the flex flow with
`position: absolute; left: 50%; transform: translate(-50%, -50%)` (relative
to `.container`, given `position: relative`) so it's centered regardless
of the toggle/hamburger widths, and `.nav-right { order: -1; }` moves the
toggle to the far left, where the brand used to sit.

### Breakpoint widening + a pre-existing drawer bug it exposed

At viewports just above the original 827px cutoff (e.g. ~966px), adding
the 46px toggle button to the desktop nav row made it overflow and wrap
onto a second line. Rather than keep shrinking nav-link spacing to cram
more into a shrinking row, the desktop/mobile breakpoint moved from 827px
to 1050px (all three: `nav .nav` hide, `.menu-wrapper`/`.menu-responsive`
hide, and the toggle-left/logo-center block above) so the roomy desktop
layout only shows when there's clearly space for it, and everything below
that falls back to the hamburger + centered-logo mobile layout, which
handles a toggle button fine.

That widening exposed a **pre-existing, unrelated bug** in the mobile
drawer: its closed (off-screen) position used `right: -625px`, a fixed
pixel offset, while the drawer's own width is `75vw` — for any viewport
wider than ~833px, `75vw` exceeds 625px and the "closed" drawer bled onto
the right edge of the screen. Below 827px this was invisible (the whole
`.menu-responsive` overlay was `display: none` there, since that used to
be the desktop cutoff too), so it went unnoticed until the breakpoint
moved and the drawer became visible over the newly-widened mobile range.
Fixed by changing the offset to `right: -100vw`, which always exceeds the
drawer's own `75vw` width regardless of viewport size, so it's fully
off-screen at any width rather than relying on a magic number tied to the
old breakpoint.

## Loading-screen intro colors

The boot-time loading-screen animation inlines its own copy of the 11
polygons (see `docs/changes/20260728-132036-animejs-loading-screen.md`) rather than
loading a logo file, so it didn't pick up the theme at all — it always
showed the full-color mark regardless of the selected theme. `pieceFill(
defaultColor)` on `LoadingScreenComponent` now mirrors `ThemeService`'s
`logoVariant()` logic per piece: `light` → `#000000`, `dark` → `#ffffff`,
`default` → that piece's own original hex, bound via `[attr.fill]` on each
`<polygon>`. Since `ThemeService`'s initial mode is resolved synchronously
when the singleton is first constructed — and `<app-loading-screen>`
mounts before `<app-header>` in `app.component.html` — the very first
frame of the intro animation already matches whatever theme is about to be
applied, with no flash of the wrong colors.

## Files touched

- `src/assets/images/logos/` — svg conversions, png deletions (above).
- `src/app/components/general/header/header.component.html` / `.ts` / `.scss`.
- `src/app/services/theme/theme.service.ts` — new.
- `src/variables.scss`, new `src/theme.scss`, `src/styles.scss` (import).
- `src/assets/config.json` — `manifestIcon` path.
- `docs/changes/20260728-132036-animejs-loading-screen.md` — note the `logo.svg` →
  `clearcolor.svg` rename.
- `src/app/components/home/banner/banner.component.scss` — name-text
  gradient switched to the `--name-gradient` token (see above).
- `src/app/services/theme/theme.service.ts` — system color-scheme
  detection and live-follow (see above).
- `src/app/components/general/header/header.component.ts` / `.html` —
  scroll-driven `logoRotationDeg` (see above).
- `src/app/components/general/header/header.component.html` / `.scss` —
  logo reverted to a plain home link, `.nav-right` / `.theme-toggle` added
  (see "Logo as home link + separate toggle button").
- `src/app/components/general/loading-screen/loading-screen.component.ts`
  / `.html` — theme-aware `pieceFill()` (see "Loading-screen intro
  colors").

## Verification

- `ng build` — no TypeScript/SCSS errors, both before and after the
  gradient fix.
- Headless-Chromium pass through all 4 toggle states (default → light →
  dark → default): confirmed via `data-theme` attribute, logo `<img src>`,
  and computed `body` background color at each step, plus a screenshot of
  each state and a `console --errors` check (none). Re-ran twice more after
  user feedback on `--name-gradient`: first to confirm `Yannis Lam;` had
  become legible in light mode, then again — after user feedback that fix
  was "visible but ugly" and dark mode's name color hadn't visibly
  changed — once all three gradients were re-sourced from the logo's own
  palette and dark mode got its own explicit value.
- System color-scheme: headless-Chromium contexts launched with
  `colorScheme: 'dark'` and `'light'` each landed on the expected initial
  mode with nothing in `localStorage`; `page.emulateMedia()` mid-session
  confirmed the live-follow behavior, and confirmed it stops following once
  an explicit `cycle()` click has stored a value.
- Scroll-rotation: read the `<img>`'s computed `transform` matrix at
  several scroll depths (0, ~344, 900, 1800, 4000px) and decoded the
  rotation angle from it — confirmed it scales linearly up to exactly 360°
  at 900px, then holds at the (visually identical to 0°) capped value for
  all scroll depths beyond that.
- Logo-as-home-link / toggle button: confirmed `.navbar-brand` renders as
  an `<a href="/">` (not a button) and that clicking it navigates without
  console errors; confirmed `.theme-toggle` cycles `data-theme`, its icon
  class, and the logo's `<img src>` through all three states without
  changing the URL; screenshotted the header at desktop (1280px) and
  mobile (480px) widths to confirm the button sits at the right edge of
  the nav in both layouts. Re-screenshotted mobile again after the
  centering/sizing follow-up: confirmed the toggle sits on the left, the
  logo is centered, the hamburger stays on the right, and the button reads
  visibly larger.
- Breakpoint fix: screenshotted the header at 700/827/966/1049/1051/1100/
  1280px, reading `.main-navbar`'s rendered height at each (100px, i.e. no
  wrap, at every width) and inspecting the screenshots directly for the
  drawer-bleed artifact. Also inspected the nav `<ul>`'s computed
  `display`/width at 966px directly (confirmed `none`/`0`, i.e. correctly
  hidden — the visible artifact at that width was the drawer bleed, not
  the nav list). Opened the hamburger drawer at 966px post-fix to confirm
  its slide-in animation still works.
- Loading-screen intro colors: preset `localStorage` to `light`/`dark`
  (and left it unset under an OS-dark context for `default`) via
  `context.addInitScript()` before each fresh page load, then read the
  first `<polygon>`'s `fill` attribute immediately after the loading
  screen appeared — confirmed `#000000`, `#ffffff`, and the original
  `#fff200` respectively, i.e. no flash of the wrong colors on first
  paint.
