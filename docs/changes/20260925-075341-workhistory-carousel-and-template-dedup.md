Date: 2026-09-25 07:53:41

# Workhistory carousel + template dedup

Third PR out of `docs/todo/code-review-optimization.md`'s suggested
grouping: "#6/#15 work-history carousel and template rewrite."

## What changed

### #6 — carousel only when there's actually more than one image

Every work-history/volunteering entry used to render **both** an
`owl-carousel-o` (visible above 1300px) and a static single-image box
(visible 768–1300px), with CSS picking which one showed at which
breakpoint — regardless of how many images the entry actually had. Since
every current entry's `imgs` array is synthesized as a single-element
array from `logoKey` (`site-config.service.ts`'s `resolveLogoKeys`),
`owl-carousel-o` was standing up its full runtime and a 3s autoplay timer
for a "carousel" that only ever had one slide to show, on every one of
the 16 work/volunteering entries.

`workhistory.component.html`'s `#visual` template now branches on
`exp.imgs.length > 1`: an `owl-carousel-o` only when there's more than
one image, a plain static image box otherwise.

This changes the CSS contract: the carousel and the static box are now
mutually exclusive per entry (never both in the DOM), so they can no
longer rely on opposite breakpoint visibility to take turns. Updated
`workhistory.component.scss` so both share the same responsive
visibility instead (visible at any width ≥768px, hidden below that where
`.workhistory-info-right/-left`'s background-image — via
`LogoFallbackBackgroundDirective` — takes over). Verified with screenshots
at 1600px/1000px/400px viewport widths against the production build
(`npx http-server dist/v3.yannislam.org/browser`) — see test plan.

### #15 — template dedup

The template duplicated the entire "visual + info" markup twice — once
inside `@if (i % 2 == 0)`, once inside `@if (i % 2 != 0)` — differing
only in which of the two came first and which `workhistory-info-left`
/`-right` class applied. Replaced with two `<ng-template>`s (`#visual`,
`#info`) authored once and placed on either side of each other via
`*ngTemplateOutlet`, chosen by `idx % 2`:

```html
@if (idx % 2 == 0) {
  <ng-container *ngTemplateOutlet="visual; context: { exp, idx }"></ng-container>
  <ng-container *ngTemplateOutlet="info; context: { exp, idx }"></ng-container>
} @else {
  <ng-container *ngTemplateOutlet="info; context: { exp, idx }"></ng-container>
  <ng-container *ngTemplateOutlet="visual; context: { exp, idx }"></ng-container>
}
```

Also:

- The inner `@for (descParagraph of exp?.description; ...)` declared its
  own `let i = $index`, shadowing the outer loop's `i` — and was never
  actually used. Renamed the outer loop variable to `idx` and dropped the
  inner one entirely (it wasn't referenced).
- `track exp`/`track img`/`track skill` → `track $index`, per the
  backlog's "works, but $index is clearer" note.
- `style='width: auto;'` on the static image's `.img-container` → a new
  `.img-container-auto` class. `style='color: inherit'` on the two
  workhistory-links `<a>` tags → a new `.workhistory-link` class.

### Not changed here

`AnalyticsService` is injected into `WorkHistoryComponent` but never
referenced anywhere in its template — noticed while reading this file,
but it's an unused-dependency finding (code-review-optimization.md #10
territory), not part of #6/#15's scope. Left alone; worth folding into
the dependency-trim PR.

## Test plan

- `npm test` — 150/150 pass (`WorkHistoryComponent`'s spec instantiates
  the component directly without rendering its template, so it doesn't
  exercise this change either way; verification here is the build +
  manual screenshots below).
- `npm run build` succeeds with no template errors — `strictTemplates`
  compiles the new `*ngTemplateOutlet`/context bindings cleanly.
- Manually verified in a browser: built the production bundle, served it
  locally, and screenshotted the first two work-history entries
  (even + odd index, so both layout directions) at 1600px (wide,
  carousel-breakpoint), 1000px (medium), and 400px (mobile) viewport
  widths. All three render the static image + info card correctly, with
  no blank/missing visual — confirming the CSS fix above actually closes
  the gap it was meant to close. Logos rendered via the SVG fallback
  (`LogoFallbackDirective`) since this sandbox's egress policy blocks the
  hotlinked logo CDNs — expected and unrelated to this change.
