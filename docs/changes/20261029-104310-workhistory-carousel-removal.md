Date: 2026-10-29 10:43:10

# Work History: Remove The Owl Carousel And The Duplicated Alternating Template

## Why

Two open items in [`docs/todo/code-review-optimization.md`](../todo/code-review-optimization.md)
(#6 and #15):

- Every work, volunteering and project entry resolves to exactly **one**
  image (`logoKey` → `imgs[0]` in `SiteConfigService.resolveLogoKeys`), yet
  each entry rendered an `owl-carousel-o` with `autoplay: true, loop: true`.
  That autoplayed a single slide forever, and the timers kept running for
  carousels that were `display: none` below 1300px or scrolled off-screen.
  It also pulled `ngx-owl-carousel-o` plus two global stylesheets into every
  page for no visible benefit.
- The `@for` body was written twice (`i % 2 == 0` / `i % 2 != 0`), and the
  duplicated `workhistory-links` block had its `@if`s and closing tags
  interleaved, so the demo link could render outside the links row.
- `Experience.link` is a bare string on some `config.json` entries and a
  one-element array on others. Binding it straight into `[href]` rendered
  `"https://www.voya.com/,"` for the array half — eight work entries had a
  comma in their `href`.

## What Changed

- `workhistory.component.html` now has one `@for` body per entry:
  - the image column always comes first in the DOM; odd rows add a
    `reverse` class (`flex-direction: row-reverse`), which preserves the
    existing negative-margin overlap in `.workhistory-info-left/right`.
  - one `<img>` per entry. Entries with more than one image (none in
    `config.json` today) get a horizontal scroll-snap strip instead of an
    autoplaying carousel, so multi-image content still works without owl.
  - link/demo-link rendering is nested correctly and uses `linkHref()`,
    which unwraps the string-or-array field (covered by a new spec).
- `workhistory.component.scss`: dropped every `.owl-carousel-o` and
  `::ng-deep .owl-theme` rule; the static column keeps its old breakpoints
  (hidden below 768px, 50% between 768 and 1300px) and takes over the
  carousel's fixed `600px` above 1300px. Inline `style='width: auto'` and
  `style='color: inherit'` became classes.
- `workhistory.component.ts`: removed `CarouselModule` / `OwlOptions` /
  `NgClass`, added `linkHref()`.
- Removed `ngx-owl-carousel-o` from `package.json` (lockfile updated) and
  its two prebuilt stylesheets from `angular.json`.
- `e2e/home-sections.spec.ts`: comment updated — the thumbnail assertion is
  unchanged because the static image is now the only copy.

## Verification

- `npm run build` passes (typecheck + template compile + 4 prerendered
  routes).
- Inspected `dist/v3.yannislam.org/browser/index.html`: 16
  `.workhistory-container` rows (10 work + 6 volunteering), 8 with
  `reverse`, 16 `img-feature-workhistory` images, zero `owl-carousel`
  markup, and no `href` containing a comma (the array-link bug).
  `/projects` renders its 6 entries the same way.
- Unit specs could **not** be run in this environment: Karma needs Chrome
  and the Playwright headless shell fails on a missing `libnspr4.so`, with
  no root to install system packages. CI's `npm test` covers them.

## Follow-ups

- The work-history `<img>` still has no `aspect-ratio`; that needs real
  per-image dimensions, as noted in
  [`docs/todo/desktop-performance.md`](../todo/desktop-performance.md).
- `@angular/animations` (`fade-stagger.animation.ts`) remains the one
  deprecated package left in the bundle (code-review #12).
