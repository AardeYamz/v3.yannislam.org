# Header SCSS consolidation (dead-code cleanup)

## Context

`header.component.scss` grew to 386 lines across several incremental
feature PRs (translucent-on-scroll header, the left-to-right entrance
animation, the 3-state theme toggle, the mobile hamburger drawer, the
827px → 1050px breakpoint widening, and a mobile-menu-animation glitch
fix) and had sat consistently over its 5 KB `anyComponentStyle` build
budget (`angular.json`) since. This pass is a pure hygiene cleanup: no
selectors were restructured and no breakpoints/behavior changed — only
CSS that could be **proven** dead or a no-op against the compiled
template (`header.component.html`) and the rest of the codebase was
removed.

Nothing was removed on a hunch. Each item below was checked against
`header.component.html`'s full git history (`git log --all -p`, back to
the initial commit) and a repo-wide `grep`, not just the current
template, in case a class was wired up conditionally or from a service.

## What was removed

### 1. `.cv-btn` (two declarations, `.menu-responsive li .cv-btn` and a
top-level `.main-navbar .cv-btn`)

No element in `header.component.html` — in any commit in the file's
history, including the very first one — has ever carried a `cv-btn`
class, and a repo-wide `grep -rn "cv-btn"` outside this one `.scss` file
returns nothing. `HeaderComponent` does have an unused `downloadResume()`
method and an injected `ResumeService`, so a "Resume" button was clearly
once planned for this component, but it was never added to the markup —
this CSS is leftover scaffolding for a feature that never shipped in this
file. (The `downloadResume()`/`ResumeService` TypeScript itself is out of
scope for a `.scss`-only cleanup and was left alone.)

### 2. `.flag-text`, `.arrow-language`, `.arrow-active`, and the two
`::ng-deep .dropdown-toggle` / `::ng-deep .dropdown-menu.show` rules

These are styles for a language-switcher dropdown (flag icon, arrow
icons, an `ngb-dropdown`-style toggle/menu). No such element, and no
`ngbDropdown` directive usage, exists anywhere in `src/` — confirmed via
`grep -rn "ngbDropdown"` (zero hits) and a search of
`header.component.html`'s entire commit history (zero hits, same as
`.cv-btn`). `HeaderComponent` does hold an unused `languageFormControl`
field, again suggesting a language switcher was scaffolded but never
wired into the template. Since `::ng-deep` pierces into child component
templates too, this was checked especially carefully — but the header
has no child components that could render these classes either.

### 3. Redundant `-webkit-box-pack` / `-webkit-box-align` declarations
(in `.main-navbar aside` and `.main-navbar aside nav`)

These are properties from the old 2009 `display: -webkit-box` flexbox
spec, and only take effect on an element whose `display` is
`-webkit-box`/`-webkit-inline-box`. This file (checked via
`grep -n "display:"`) never sets that old-model `display` value anywhere
— both rules already use modern `display: flex` right next to the old
properties, which is what actually does the centering/justification.
Confirmed empirically too: this component renders identically with or
without these two declarations at every breakpoint tested (see
Verification).

## What was *not* touched (considered and rejected)

- **`.menu-wrapper`'s `top/left/right/bottom: 0` and `z-index: 11`** — a
  `getComputedStyle()` check in a real browser session shows
  `.menu-wrapper` is `position: static`, which means these inset/z-index
  properties currently have no effect (inset properties only apply to
  positioned elements). They *look* dead by the same reasoning as the
  `-webkit-box-*` properties above, but removing "currently inert"
  properties from a rule that's still actively used for other properties
  (`width`, `height`, `cursor`) is a different, less certain kind of
  claim than "this class doesn't exist in the template" — and touching
  positioning/stacking here is exactly the kind of change that could
  interact with something not caught by a handful of manual screenshots.
  Left alone per the "be conservative" brief.
- **Duplicate `@media (max-width: 1050px)` blocks** — the file has two
  separate `@media (max-width: 1050px) { ... }` blocks (one for
  `.nav-right`/`.container`/`.navbar-brand` centering, one for
  `nav .nav`/`.on-top`/`.menu-wrapper`). They don't share any selectors,
  so merging them into one block would be a pure whitespace/structure
  change, not a dead-code removal, and was left alone to keep this diff
  strictly to provable removals.
- **`.nav-link`** — initially looked unused (no `class="nav-link"`
  anywhere in the template), but `@ng-bootstrap`'s `NgbNavLink` directive
  (applied via `<a ngbNavLink>` in the template) adds a `nav-link` class
  to its host element automatically — confirmed via
  `src/bootstrap-custom.scss`'s own usage-audit comment. This rule is
  live and was kept.

## Before / after

| | Before | After |
|---|---|---|
| Source file length | 386 lines / 10,027 bytes | 337 lines / 9,077 bytes |
| Compiled component style size (`anyComponentStyle` budget check) | 5.52 kB | 4.74 kB |
| Budget status (`maximumWarning: 5kb`) | **Exceeded by 519 bytes** | Within budget (≈260 bytes of headroom) |

`npx ng build` (production configuration) now completes with no
`header.component.scss exceeded maximum budget` warning at all.

## Verification

- `npx ng build --configuration production` succeeds with no new errors
  or warnings; the pre-existing `anyComponentStyle` budget warning for
  this file is gone. (Remaining Sass `@import` deprecation warnings are
  pre-existing, unrelated to this file, and come from
  `src/bootstrap-custom.scss`.)
- Confirmed the compiled sizes above by temporarily dropping
  `maximumWarning` to `0kb` locally (not committed) to force Angular to
  report the exact compiled size on both the pre-change and post-change
  file, then restored `angular.json`.
- `npx ng serve` + headless Chromium (Playwright), before vs. after this
  change, at 480px, 827px, 1050px, and 1280px viewport widths:
  - Screenshotted the header at rest, scrolled (to confirm the
    translucent/blurred `nav-shadow` backdrop still applies), and after
    cycling the theme toggle through all 3 states (default → light →
    dark), at every width.
  - At 480px and 827px, additionally opened and closed the mobile
    hamburger drawer, screenshotting the open state (confirming the
    hamburger → X animation and the drawer's slide-in/backdrop still
    render correctly) and the closed state after.
  - Pixel-diffed every before/after screenshot pair. The only
    differences found were from content that changes over time
    independent of any CSS (the banner's rotating job-title typewriter
    text, and floating decorative background icons with their own
    animation) — diffing was re-run cropped to just the header band
    (and, for the drawer, confirmed the diff pixels sat entirely in the
    page content bleeding through the drawer's transparent margin, never
    in the drawer panel or header chrome itself). The header nav bar,
    logo, menu links, theme-toggle icon, hamburger icon, and drawer
    panel are pixel-identical before vs. after at every width and state
    checked.
  - Checked the browser console at each step: no errors introduced (the
    only console errors seen, before and after alike, are Google
    Analytics' `gtag.js` being blocked by this sandbox's network egress
    rules — pre-existing and unrelated).
  - Also confirmed `.menu-wrapper`'s computed `position`/`z-index` are
    unchanged (`static` / `11`) before and after, since those values
    were examined (and deliberately left alone) during the review above.

## Files touched

- `src/app/components/general/header/header.component.scss` — the
  removals described above.
