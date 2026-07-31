# Trimming the global FontAwesome / Bootstrap CSS bundle

## Context

`angular.json`'s global `styles` array shipped two full third-party CSS
frameworks on every page, even though the site only uses a small slice of
each:

- `node_modules/@fortawesome/fontawesome-free/css/all.css` — every icon
  style family (solid, regular, brands, light, thin, duotone, sharp, …).
- `node_modules/bootstrap/dist/css/bootstrap.min.css` — the full compiled
  Bootstrap framework (every component: modal, carousel, accordion,
  dropdown, tooltip, popover, tables, forms, badges, alerts, …).

On top of that, `src/styles.scss` *also* did `@use
"node_modules/bootstrap/scss/bootstrap.scss" as *;` — a second, independent
full copy of Bootstrap compiled from Sass source. So Bootstrap was being
shipped **twice** in the production bundle: once as the pre-compiled
`bootstrap.min.css`, once compiled fresh from `bootstrap.scss` inside
`styles.scss`.

Neither framework needed to be there in full. This change trims both to
only what's actually used, verified by grepping every template/SCSS file in
`src/app` and `src`.

## Usage audit

**FontAwesome** — every icon class in the codebase, found via:
```
grep -rn "fa-\|fas \|far \|fab \|fa-solid\|fa-regular\|fa-brands" src/app --include=*.html
```
- `fa-solid` / `fas` (classic/solid style) — theme-toggle icon
  (`fa-circle-half-stroke`, `fa-sun`, `fa-moon` in
  `header.component.html`) and the workhistory external-link icons
  (`fa-up-right-from-square`, `fa-external-link-alt` in
  `workhistory.component.html`).
- `fab` (brands style) — footer social icons, driven by
  `src/assets/config.json`'s `icon` fields: `fa-linkedin-in`, `fa-github`,
  `fa-envelope`, `fa-tiktok`, `fa-facebook-f`, `fa-instagram`
  (`footer.component.html`: `class="fab {{social.icon}}"`).
- `far` (regular style) — **not used anywhere** (the only two source hits
  for the substring `far` are inside the English words "How **far**" and
  "how **far** the page can scroll", not an icon class).

Font Awesome 7 (installed here, `7.3.1`) restructured how the free package
splits its CSS versus the older FA5/6 layout the task brief anticipated:
`node_modules/@fortawesome/fontawesome-free/css/fontawesome.css` is now the
*shared core* — it holds the name→glyph mapping for every classic
(solid/regular/light/thin/duotone) icon, since those styles share glyph
codepoints and only differ by font-weight/font-file. `solid.css` and
`regular.css` are now tiny — just the `@font-face` + the `.fas`/`.far`
style-selector rule. `brands.css` is the odd one out: brand icons use their
own separate font/glyph codepoints, so it carries both the `@font-face`
*and* its own full name→glyph table for every brand icon (linkedin-in,
github, tiktok, facebook-f, instagram, etc.), independent of `fontawesome.css`.

Net effect: because the four icons this site needs from the classic family
(`fa-circle-half-stroke`, `fa-sun`, `fa-moon`, `fa-up-right-from-square`,
`fa-external-link-alt`, plus `fa-envelope`) all still require the same
shared `fontawesome.css` core (it isn't per-style-splittable further
without manually deleting individual icon rules), the realistic, safe win
here is dropping `regular.css` (unused) and the four other unused style
families (light/thin/duotone/sharp, which aren't even shipped as separate
files in `all.css`'s icon set) — i.e. **`all.css` → `fontawesome.css` +
`solid.css` + `brands.css`**.

**Bootstrap** — every `class="..."` attribute in `src/app/**/*.html`,
cross-checked against `node_modules/bootstrap/scss/`:
- Grid/layout: `container`, `row`, `col-12`, `col-md-6`, `col-lg-6`,
  `col-xl-4` (namecard grid, about section).
- Navbar: `navbar`, `navbar-brand` (`header.component.html`).
- Nav: `nav-tabs` (`education.component.html`) plus classes injected
  automatically by `@ng-bootstrap/ng-bootstrap`'s `NgbNav` directives
  (confirmed by reading
  `node_modules/@ng-bootstrap/ng-bootstrap/fesm2022/ng-bootstrap-ng-bootstrap-nav.mjs`):
  `NgbNav` → `nav` (+ `flex-column` when `orientation="vertical"`, used by
  the education tabs), `NgbNavItem` → `nav-item`, `NgbNavLink` → `nav-link`.
- Utilities: `d-flex`, `d-none`, `d-md-block`, `text-center`,
  `text-capitalize`, spacing utilities (`mt-*`, `mb-*`, `mx-*`, `p-0`,
  `m-0`), `w-100`.
- No usage anywhere of Bootstrap's JS-driven components — modal, dropdown,
  accordion, carousel (the site uses `ngx-owl-carousel-o` for its carousel,
  loaded separately and left untouched), offcanvas, tooltip, popover,
  toasts — nor of `btn`/`card`/`badge`/`alert`/`table`/`form-control` etc.
  (`main-btn`, `div-btn-banner`, `section-box` etc. are the site's own
  custom classes, not Bootstrap's).
- `helpers` (Bootstrap's clearfix/ratio/stretched-link/visually-hidden/
  vstack/hstack partial) — no usage found, dropped.
- `text-left`/`text-right`/`ml-3` appear in a couple of templates but
  Bootstrap 5 dropped those (renamed to `text-start`/`text-end`/`ms-3` for
  RTL support) — `bootstrap.min.css` never actually defined them, so they
  were already inert before this change (`text-left`/`text-right` happen to
  be redefined locally and scoped in `workhistory.component.scss`, which is
  what actually styles them). Confirmed dead classes, not a regression risk
  either way.

## What changed

**`angular.json`** — `styles` array:
- `node_modules/@fortawesome/fontawesome-free/css/all.css` replaced with
  `fontawesome.css` + `solid.css` + `brands.css`.
- `node_modules/bootstrap/dist/css/bootstrap.min.css` **removed outright**
  — it was pure duplication of the full-Bootstrap `@use` already inside
  `src/styles.scss` (see below), which stayed in the `styles` array.

**New `src/bootstrap-custom.scss`** — a hand-picked subset of Bootstrap's
Sass partials instead of the monolithic `bootstrap/scss/bootstrap`:
```scss
// Configuration (required by everything below)
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/variables-dark";
@import "node_modules/bootstrap/scss/maps";
@import "node_modules/bootstrap/scss/mixins";
@import "node_modules/bootstrap/scss/utilities";

// Base
@import "node_modules/bootstrap/scss/root";
@import "node_modules/bootstrap/scss/reboot";
@import "node_modules/bootstrap/scss/type";
@import "node_modules/bootstrap/scss/containers";
@import "node_modules/bootstrap/scss/grid";

// Components actually used in templates (navbar, nav/nav-tabs via NgbNav)
@import "node_modules/bootstrap/scss/nav";
@import "node_modules/bootstrap/scss/navbar";

// Utility classes (d-flex/d-none/d-md-block, m*/p* spacing, text-center,
// text-capitalize, flex-column, w-100, etc.) generated from the utilities map
@import "node_modules/bootstrap/scss/utilities/api";
```
`reboot`, `type`, and the full `utilities/api` generation (rather than
hand-pruning the `$utilities` Sass map to the dozen classes actually used)
were kept in on purpose: the site has no reset of its own for bare
elements, and pruning the utilities map by hand risks silently breaking a
class used through a dynamic binding that a text grep could miss, for very
little payload in return — trimming `utilities/api` down further (measured
by temporarily removing it) only saved ~4 kB gzipped, since utility classes
compress extremely well. Not worth the risk for that little.

**`src/styles.scss`** — `@use "node_modules/bootstrap/scss/bootstrap.scss"
as *;` replaced with `@use "./bootstrap-custom.scss" as *;`.

No component templates or `.scss` files were touched — every class the
audit found is still defined.

## Before / after (production build, `npx ng build --configuration production`)

| | Before | After | Change |
|---|---|---|---|
| `styles.css` (raw) | 489.56 kB | 208.16 kB | **−281.4 kB (−57.5%)** |
| `styles.css` (transfer/gzip, estimated) | 48.72 kB | 29.99 kB | **−18.73 kB (−38.4%)** |
| Initial bundle total (raw) | 1.11 MB | 832.73 kB | −281.4 kB |
| Initial bundle total (transfer, estimated) | 215.71 kB | 196.98 kB | −18.73 kB |

JS chunks (`main`, polyfills, lazy `aardeyamz` chunk) are unchanged — all of
the savings are in the stylesheet, as expected.

## Visual smoke check

`npx ng serve` + headless Chromium (Playwright), screenshotting `/`,
`/projects`, and `/aardeyamz`:
- All Font Awesome icons render: theme-toggle icon in the header, the
  workhistory external-link icons, and all six footer social icons
  (including `fa-envelope`, which — both before and after this change —
  renders using the brands font-family per `class="fab {{social.icon}}"`
  in `footer.component.html` even though the envelope glyph itself lives
  in the classic/`fontawesome.css` name table, not `brands.css`; this
  mismatch is pre-existing and unrelated to the trim, unchanged by it).
- Bootstrap grid/nav/navbar layout intact: the `aardeyamz` namecard grid
  (`row`/`col-*`), the top nav (`navbar`/`navbar-brand`, `NgbNav`-driven
  menu), and the education `nav-tabs` all render and lay out identically.
- No new console errors. The only console output on any of the three pages
  is pre-existing and unrelated to this change: an `NG0955` duplicate-track
  warning from the `ngx-owl-carousel-o` clone rendering, `NG0913`
  oversized-image warnings, and `ERR_TUNNEL_CONNECTION_FAILED` for a
  handful of genuinely external third-party images/scripts (Google Tag
  Manager, third-party CDN logos/photos) that this sandbox's network proxy
  blocks outbound — none of it CSS-related; the local `styles.css` request
  itself returned `200`.

## Files touched

- `angular.json` — `styles` array (FontAwesome split, Bootstrap compiled
  CSS removed).
- `src/bootstrap-custom.scss` — new, trimmed Bootstrap Sass entry point.
- `src/styles.scss` — import swapped to `bootstrap-custom.scss`.
