# Material Design 3 token layer

## Context

Ask: bring the site up to "the latest Material Design 3 standards." The site's
visual identity (navy/slate/orange, `src/theme.scss` + `src/variables.scss`,
see `documentation/logo-svg-dark-mode.md` for how the 3-mode color system
came about) is a deliberate, hand-tuned part of the brand — replacing it with
a fresh MD3 seed-color palette would throw that away for no real benefit. So
the scope agreed on was narrower than "restyle from scratch": **keep the
existing hues, but restructure them into proper MD3 color roles, and adopt
MD3's shape scale, elevation levels, and state-layer interaction pattern**
across the existing hand-rolled components (no Angular Material/CDK
dependency added).

## Color roles: aliasing, not duplicating

MD3 defines semantic roles — `primary`, `on-primary`, `surface`,
`on-surface-variant`, `outline`, etc. — rather than raw hues. The existing
palette already had the right *number* of tones per mode, just named for
what they looked like (`--color-navy`, `--color-slate`, ...) instead of what
they're *for*. `src/theme.scss` now defines the MD3 roles as a second layer
on top of the original variables:

```scss
--md-sys-color-primary: var(--color-orange);
--md-sys-color-surface: var(--color-navy);
--md-sys-color-on-surface: var(--color-lightest-slate);
--md-sys-color-on-surface-variant: var(--color-slate);
--md-sys-color-surface-container: var(--color-light-navy);
--md-sys-color-surface-container-high: var(--color-lightest-navy);
/* ...plus primary-container, secondary, outline, outline-variant, etc. */
```

Because CSS custom properties resolve at **use time**, not at definition
time, these only need to be declared once at `:root`. Each `[data-theme]`
block still only overrides the base `--color-*` values (unchanged from
before this work); the `--md-sys-color-*` roles that reference them
automatically pick up whichever mode is active — no per-mode duplication of
the role tokens themselves.

A couple of the tonal "container" tiers (`surface-container-low`,
`surface-container-highest`) don't have a direct existing variable to alias,
so those are computed once via `color-mix(in srgb, ...)` between two
existing colors rather than hand-picking new literal hex values per mode —
keeping the "no new hues" constraint intact.

### The one role that can't just alias a variable

`--md-sys-color-on-primary` needs to always be the *dark* extreme (for
contrast against the mid-tone orange primary), but which raw variable is
dark flips between modes: `--color-navy` is dark in the default/dark themes
but is the near-white *background* in light mode (light mode's dark extreme
is `--color-white` instead — see the existing per-mode table in
`documentation/logo-svg-dark-mode.md`). So `on-primary` (and `on-secondary`,
same reasoning) is set at `:root` to `var(--color-navy)`, then the
`[data-theme="light"]` block overrides just those two properties to
`var(--color-white)`. Every other role tier didn't need this — it's specific
to roles that sit on top of a filled, mid-tone surface rather than the
page's own background.

## Shape, elevation, and state layers

Added alongside the color roles, all mode-agnostic (declared once at
`:root` in `theme.scss`):

- **Shape scale**: `--md-sys-shape-corner-{none,extra-small,small,medium,
  large,extra-large,full}` (0 → 999px), mirrored as SCSS variables
  (`$ShapeSmall`, `$ShapeFull`, ...) in `variables.scss`.
- **Elevation**: `--md-sys-elevation-level{0-5}`, the standard MD3
  key+ambient shadow pairs. Dark surfaces lean on the surface-container
  tiers above for most of their "elevation" read (per MD3 dark-theme
  guidance of tonal elevation over shadow), with the shadow levels used on
  top for scroll/hover/press feedback.
- **State-layer opacities**: `--md-sys-state-{hover,focus,pressed,dragged}-opacity`
  (8% / 10% / 10% / 16%), plus a reusable `md-state-layer($color)` SCSS
  mixin in `variables.scss` that expands to a `::before` overlay whose
  opacity ramps on `:hover` / `:focus-visible` / `:active`.

### A stacking-order bug caught while building the mixin

The natural way to write a state-layer overlay is an absolutely-positioned,
`inset: 0` pseudo-element with no explicit `z-index`. That's wrong: per the
CSS painting-order spec, a positioned descendant with `z-index: auto` is
painted **after** (i.e. on top of) the host's own in-flow inline content —
so an unwrapped icon or raw text label (e.g. the footer's email link, or any
button's own text) would end up hidden *under* the hover tint instead of
sitting above it. Caught before it shipped by reasoning through the spec's
painting-order steps rather than by visual inspection, since it's the kind
of bug that only shows up on elements whose visible content isn't wrapped in
its own positioned child.

Fix: the mixin gives the host `isolation: isolate` (forces a new stacking
context without touching the `z-index` property itself) and gives the
pseudo `z-index: -1`. That combination paints the overlay above the host's
own background but below all of its normal content, regardless of whether
that content is raw text, an icon, or a wrapped block. `isolation: isolate`
was picked over the more obvious `z-index: 0` specifically because at least
one caller (`.namecard-box`) already carries its own load-bearing
`z-index: 1` (used for the card's hover-grow-over-neighbors overlay
behavior — see `namecard.component.scss`) — setting `z-index: 0` in the
mixin would have silently clobbered that in the cascade, since both
declarations target the same selector at the same specificity and the later
one (the mixin's) wins.

The mixin originally also took a `$corner` parameter to round the pseudo's
own corners. That turned out to be dead weight: every caller already sets
`overflow: hidden` plus a matching `border-radius` on the host itself, which
clips the `inset: 0` pseudo to that same rounded shape regardless of the
pseudo's own radius. Dropped the parameter — it was pure redundant CSS bulk,
and removing it (along with some now-genuinely-dead CSS, below) is what got
`header.component.scss` back under its component style budget (see
Verification).

## Applied across components

- **Global** (`src/styles.scss`): `.main-btn` → pill shape
  (`$ShapeFull`), `$Outline`-colored border, primary-tinted state layer.
  `.section-title`, `.underline`, and body/`.section` background swapped
  onto the new role tokens.
- **Header/nav** (`header.component.scss`): `.theme-toggle` → proper MD3
  icon button (circular state layer instead of the old scale+border-color
  hover hack); mobile drawer (`aside`) → `$SurfaceContainerHigh` fill +
  `$Elevation3`; scroll-triggered app-bar shadow (`.nav-shadow`) →
  `$Elevation2`.
- **Cards** (`workhistory.component.scss`, `namecard.component.scss`):
  `$ShapeMedium`/`$ShapeLarge` corners, `$Elevation1` at rest stepping up to
  `$Elevation2`/`$Elevation3` on hover — namecard keeps its existing
  grow-on-hover interaction (site-specific, not an MD3 concern) but now also
  gets a state-layer tint and a proper elevation step.
- **Education tabs** (`education.component.scss`): rebuilt as an MD3
  vertical-tab pattern — a `$Primary`-colored leading-edge indicator plus
  `$SurfaceContainerHigh` fill on the active tab, with a plain state layer
  (no color/fill swap) for hover so hover and active read as visibly
  different states, which the old CSS didn't distinguish (both were the
  exact same hard `background-color`/`color` swap).
- **About/footer/contact/banner**: shape tokens on the photo frame,
  state-layer icon buttons on the footer's social links, and role-token
  swaps (`$Orange` → `$Primary`, `$LightestSlate` → `$OnSurface`, etc.)
  wherever those exact colors were already in play — left the
  `$LightSlate`/`$Slate` two-tier distinction alone rather than collapsing
  it into a single `on-surface-variant`, since MD3's 2-tier text model would
  have flattened a hierarchy this design already uses on purpose.

## Bugs fixed along the way

Found while tracing which literal colors/shadows needed a token, not sought
out separately:

- **`.main-btn`'s hover fill was `rgba(100, 255, 218, 0.07)`** — a teal,
  left over from whatever template this button style was originally based
  on. It never matched the site's orange accent in any of the 3 themes.
  Replaced by the primary-tinted state layer.
- **Education tabs' divider used a hardcoded `rgb(48, 60, 85)`** — the
  literal default-mode value of `--color-lightest-navy` — layered directly
  on top of (overriding) the `border-left: 2px solid $LightestNavy` rule
  right above it in the same block. It silently ignored light/dark mode.
  Replaced with `$OutlineVariant`.
- **Dead CSS**: `header.component.scss` had `.flag-text`, `.arrow-language`,
  `.dropdown-toggle`/`.dropdown-menu`, and `.arrow-active` rules (~35 lines)
  for what looks like a removed language-switcher dropdown — confirmed via
  a repo-wide grep that no template anywhere references those classes.
  Removed rather than re-themed.

## Files touched

- `src/theme.scss` — MD3 color roles (per-mode via inheritance, plus the
  `on-primary`/`on-secondary` light-mode override) and the mode-agnostic
  shape/elevation/state-layer/motion tokens.
- `src/variables.scss` — SCSS aliases for all of the above, plus the
  `md-state-layer` mixin.
- `src/styles.scss` — global button/link/section-title/body restyle.
- `src/app/components/general/header/header.component.scss`,
  `src/app/components/general/footer/footer.component.scss`,
  `src/app/components/general/loading-screen/loading-screen.component.scss`,
  `src/app/components/home/{about,banner,contact,education,workhistory}/*.component.scss`,
  `src/app/components/other/aardeyamz/namecard/namecard.component.scss` —
  component-level shape/elevation/state-layer/role application described
  above.

## Verification

- `ng build` (production config) — passes. `angular.json` enforces a
  per-component style budget (5kb warning / 6kb error); the added
  shape/elevation/state-layer rules initially pushed
  `header.component.scss` 558 bytes over the *error* threshold. Fixed by
  removing the confirmed-dead dropdown CSS (above) and the redundant
  `$corner` mixin parameter (above) rather than loosening the budget itself.
  Final state: `header.component.scss` and `workhistory.component.scss`
  both sit a few hundred bytes over the 5kb *warning* threshold (non-fatal,
  pre-existing headroom issue not specific to this change), everything else
  is clean.
- `ng test` (ChromeHeadlessNoSandbox, since the sandbox environment runs as
  root) — 61/67 passing; the 6 failures are pre-existing TestBed
  configuration gaps (`app-banner is not a known element`, missing
  `provideAnimations()` for `@animateFooter`, etc.) unrelated to this
  change — confirmed by their signatures, which are all Angular
  module/DI wiring errors, not styling assertions.
