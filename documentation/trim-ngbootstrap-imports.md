# Trimming the `NgbModule` (`@ng-bootstrap/ng-bootstrap`) import

## Context

`src/app/app.module.ts` and `src/app/components/general/general.module.ts`
both imported the full `NgbModule` barrel from `@ng-bootstrap/ng-bootstrap`
— every component the library ships (dropdowns, modals, tooltips,
popovers, accordions, collapses, typeahead, datepicker, pagination,
rating, progressbar, alert, carousel, nav, offcanvas, scrollspy), even
though the site only uses one of them. `general.module.ts` additionally
imported `NgbDropdownModule` on top of the already-all-inclusive
`NgbModule`, which was redundant regardless.

`src/app/components/home/home.module.ts` already did this correctly —
it imports only `NgbNavModule` — and served as the template for this
change.

## Usage audit

Repo-wide grep for every `Ngb*` directive/component selector the library
exposes:

```
grep -rEon 'ngbDropdown|ngbModal|ngbTooltip|ngbPopover|ngbAccordion|ngbCollapse|ngbTypeahead|ngbDatepicker|ngbPagination|ngbRating|ngbProgressbar|ngbAlert|ngbCarousel|ngbNav|ngbOffcanvas|ngbScrollSpy' src/app --include=*.html --include=*.ts
```

Only `ngbNav` (and its companion directives `ngbNavItem`, `ngbNavLink`,
`ngbNavContent`, `ngbNavOutlet`) appear anywhere in the app, in exactly
two templates:

- `src/app/components/general/header/header.component.html` — the main
  site nav (part of `GeneralModule`).
- `src/app/components/home/education/education.component.html` — the
  vertical education-history tabs (part of `HomeModule`, already
  importing only `NgbNavModule`).

Nothing at the app-root level (`app.component.html`, which only contains
`<app-loading-screen>`, `<app-header>`, `<router-outlet>`, and
`<app-footer>`) uses any `ngb*` directive directly, so `NgbModule` could
be dropped from `app.module.ts` outright rather than replaced with a
narrower import.

## What changed

**`src/app/app.module.ts`** — removed the `NgbModule` import and its
entry in the `imports` array. `HomeModule` and `GeneralModule` (both
imported here) bring in whatever `Ngb*` module they individually need,
so nothing else has to fill the gap at the root.

**`src/app/components/general/general.module.ts`** — replaced
`NgbDropdownModule, NgbModule` with just `NgbNavModule`, matching
`header.component.html`'s actual usage and mirroring `home.module.ts`'s
existing pattern.

`home.module.ts` was left untouched — it already imported only
`NgbNavModule`.

No templates or component code changed; only the two `NgModule`
`imports` arrays.

## Before / after (production build, `npx ng build`)

| | Before | After | Change |
|---|---|---|---|
| `main-*.js` (raw) | 601.96 kB | 583.81 kB | **−18.15 kB** |
| `main-*.js` (transfer, estimated) | 155.18 kB | 151.87 kB | **−3.31 kB** |
| Initial bundle total (raw) | 845.03 kB | 826.89 kB | **−18.14 kB (−2.1%)** |
| Initial bundle total (transfer, estimated) | 196.61 kB | 193.30 kB | **−3.31 kB (−1.7%)** |

`styles.css` and `polyfills.js` are unchanged — this change only touches
JS-side tree-shaking of the `@ng-bootstrap/ng-bootstrap` package, so all
of the savings land in the `main` chunk, as expected. The trimmed
`ng-bootstrap` surface (dropdown/modal/tooltip/popover/accordion/etc.)
is no longer pulled into the bundle at all now that only `NgbNavModule`
is referenced anywhere in the module graph.

## Visual smoke check

`npx ng serve` + headless Chromium (Playwright) against `/`:

- Header nav (`ngbNav`, `GeneralModule`): all 5 tabs (`01. About` …
  `05. Projects`) render with their labels, and clicking each one works
  — the in-page items scroll-navigate within `/`, and `05. Projects`
  correctly routes to `/projects`.
- Education section nav (`ngbNav`, `HomeModule`): all 3 tabs (`CICS BS`,
  `ECON BA`, `HS`) render, and clicking each one switches the active tab
  (`nav-item` active class moves) and swaps the displayed content
  (`ngbNavOutlet`) correctly.
- No new console errors. The only console output was
  `ERR_TUNNEL_CONNECTION_FAILED` for genuinely external third-party
  resources (Google Tag Manager, Vercel Speed Insights, third-party
  employer/school logos and profile photos) that this sandbox's network
  proxy blocks outbound — pre-existing, unrelated to this change, and
  not `ng-bootstrap`-related.

## Files touched

- `src/app/app.module.ts` — removed `NgbModule` import and usage.
- `src/app/components/general/general.module.ts` — `NgbDropdownModule,
  NgbModule` → `NgbNavModule`.
