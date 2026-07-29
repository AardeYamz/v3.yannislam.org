# Projects Section

A new "05. Projects" page was added as its own route (`/projects`) rather than a scroll-anchor section on the home page — reached only via a menu click. It lists "5.1. College Projects" directly; "5.2. High School Projects" is a separate `/projects/highschool` route, reachable only via a "View High School Projects" link at the bottom of the College Projects list (with a "← Back to Projects" link on the way back) — it isn't rendered on `/projects` and isn't in the nav.

## Data

`src/assets/config.json` already had a populated `projects` key (ported from the legacy `yannislam.org` Gatsby site) that nothing consumed yet. It was reshaped to match the same `{ sectionId, navNumber, headingText, list }` envelope that `about.experiences.work` / `.volunteering` already use (see `documentation/volunteering-section.md`), plus a master-heading envelope of its own so the page reads as one "Projects" section with two subsections rather than two independent top-level sections:

```json
"projects": {
  "sectionId": "projects",
  "navNumber": "05.",
  "headingText": "What have I built?",
  "college": {
    "sectionId": "projects-college",
    "navNumber": "5.1.",
    "headingText": "College Projects",
    "list": [ /* 6 entries */ ]
  },
  "highschool": {
    "sectionId": "projects-highschool",
    "navNumber": "5.2.",
    "headingText": "High School Projects",
    "list": [ /* 4 entries */ ]
  }
}
```

Each list entry was normalized to `WorkHistoryComponent`'s expected shape: `project` → `title`, `time` → `timeframe`, `imgs` (a bare filename string) → `imgs: ["assets/images/projects/<filename>"]` (array of resolvable paths, since the template does `exp.imgs[0]` and iterates `exp.imgs`), `description` always an array (two entries had a single string), `link` omitted when empty rather than kept as `""`, and the unused `image_alt` field dropped.

The `description` arrays also needed a real content cleanup, not just a shape fix: the source data had been hand-wrapped into ~100-character-wide lines for some old fixed-width layout, with each line stored as a separate array element. Since `WorkHistoryComponent` renders one `<p>` per array element, this made paragraphs visibly fracture mid-sentence with a gap between fragments (worst on the OLS regression and DBTBT entries, where a line break landed mid-clause). Every entry was rejoined into properly-bounded paragraphs — one paragraph per entry, except the two longest (OLS regression, DBTBT), which read better split into two logical paragraphs at their natural topic break. A handful of literal misspellings from the original source were fixed opportunistically while in there (`ardunio`→`Arduino`, `slugish`→`sluggish`, `comptetition`→`competition`, `exhbit`→`exhibit`, `satelite`→`satellite`, a duplicated "the the"); wording/grammar otherwise left as originally written.

`SiteConfigService` (`src/app/services/site-config/site-config.service.ts`) gained a `readonly projects: any = this.data.projects;` accessor, following the same single-point-of-config-access pattern already used for `menu`, `experiences`, and `contacts`.

A new `siteMenu` entry was added:
```json
{
  "navID": 5,
  "navNumber": "05. ",
  "navTitle": "Projects",
  "navContent": "What have I built?",
  "scrollSection": "",
  "siteLocation": "/projects"
}
```
An empty `scrollSection` (rather than a same-page anchor) is what tells the header to route instead of scroll — see below.

## Component: `WorkHistoryComponent` reused, no new card/grid component

`ProjectsComponent` (`src/app/components/home/projects/`) is a thin page wrapper — same shape as `HomeComponent` (declared, non-standalone, inside `HomeModule`, reads its data via `SiteConfigService`) — that renders a master "05. What have I built?" heading (the site's usual hand-rolled `.section`/`.section-box`/`.section-title` markup, matching the About/Education convention, bound to `projects.sectionId`/`.navNumber`/`.headingText`), followed by the "5.1. College Projects" subsection via `WorkHistoryComponent`, then a centered CTA button linking to a separate `/projects/highschool` route rather than rendering High School Projects inline:

```html
<app-workhistory
  [subsection]="true"
  [experienceList]="projects.college.list"
  [sectionId]="projects.college.sectionId"
  [navNumber]="projects.college.navNumber"
  [headingText]="projects.college.headingText">
</app-workhistory>
<a [routerLink]="['/projects', 'highschool']" class="main-btn text-capitalize">
  View {{projects.highschool.headingText}}
</a>
```

`ProjectsHighschoolComponent` (`src/app/components/home/projects-highschool/`) is the same pattern one level down: a "← Back to Projects" link (`routerLink="/projects"`) followed by the "5.2. High School Projects" subsection via the same `WorkHistoryComponent`. High School Projects is only reachable by clicking through — it isn't rendered on `/projects` at all, and isn't in the nav.

Both `ProjectsComponent` and `ProjectsHighschoolComponent` were declared inside `HomeModule` (not made standalone) specifically so they could use `<app-workhistory>` without needing to export it across a module boundary — `WorkHistoryComponent` is declared but not exported from `HomeModule`, and every existing consumer (`HomeComponent`) lives in the same module for the same reason. `RouterModule` had to be added to `HomeModule`'s `imports` too — it previously only reached the app via `GeneralModule` (for the header's nav), and neither `routerLink` here nor the CTA/back links would resolve without it.

Two small, additive changes were made to `WorkHistoryComponent` itself, both backward-compatible (default `false`/no-op, so Experience and Volunteering are visually unaffected):
- A new `@Input() subsection = false` toggles a `subsection-title` class on its heading (`workhistory.component.scss`) that renders at a smaller size than the page-level `.section-title` — this is what makes "College Projects" / "High School Projects" read as children of "What have I built?" rather than as two more top-level page sections.
- `organization` was unconditionally rendered (`&#64; {{exp.organization}}`) for Experience/Volunteering entries, which all have one — Projects entries don't, so the line rendered a bare "@". Guarded with `@if (exp?.organization)`.

Both the master heading and the "back" link needed the same page-specific tweak: their `.section-box` top padding is bumped to `160px` / `140px` respectively (vs. the global default of `130px`). Every other section on the site clears the fixed 100px header for free because it sits below `<app-banner>`'s hero; Projects and its sub-route have no banner and are the first thing on their route, so the heading would otherwise render partly hidden behind the fixed nav.

The CTA button surfaced an unrelated latent bug in the shared `.main-btn` class: it's an `<a>` with padding but no `display: inline-block`, which only ever mattered for the site's existing short one-line buttons ("Email Me"). "View High School Projects" wraps to two lines on mobile, and an inline element's background/border doesn't reflow across wrapped lines the way a block does — the box only wrapped the first line. Fixed with a scoped `.main-btn { display: inline-block; }` override inside `.projects-highschool-link-box` rather than touching the shared global class (which other buttons may depend on rendering as `inline`).

## Routing

`/projects` and `/projects/highschool` were registered directly (eagerly, `component: ...`) in `app-routing.module.ts`, the same way `/` (`HomeComponent`) is — neither component is standalone, so they aren't candidates for the `loadComponent()` lazy pattern used by `/aardeyamz`, and since `HomeModule` (where they live) is already imported eagerly by `AppModule`, lazy-loading them would provide no bundle-splitting benefit anyway.

`RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })` was added (previously just `RouterModule.forRoot(routes)`) — without it, Angular's router preserves scroll offset across client-side navigations by default, so clicking the "View High School Projects" CTA from partway down `/projects` landed on `/projects/highschool` at the same scroll offset instead of the top of the new page. This wasn't visible before because the only two prior routes (`/` and `/aardeyamz`) were exclusively reached from the header nav, which is always clicked from a mostly-scrolled-to-top position.

## Header: real route navigation, not just scroll

The header's nav menu (`src/app/components/general/header/header.component.ts` / `.html`) was originally hardwired to always call `scroll(menuItem.scrollSection)` regardless of the item — fine for same-page anchors, but Projects needed real navigation instead. Added a `navigate(menuItem)` method:

```ts
navigate(menuItem: any) {
  if (menuItem?.scrollSection) {
    this.scroll(menuItem.scrollSection);
  } else if (menuItem?.siteLocation) {
    this.router.navigateByUrl(menuItem.siteLocation);
    this.responsiveMenuVisible = false;
  }
}
```
Both the desktop and mobile-drawer menu loops now call `navigate(menuItem)` instead of `scroll(...)` directly — existing scroll-anchor items are unaffected (they all have a `scrollSection`).

### Incidental bug fix: `$safeNavigationMigration`

While editing the exact two click-handler expressions above, a stray, undefined function call — `$safeNavigationMigration(...)`, left over from the "Update to Angular 22" migration commit and never actually defined anywhere in the codebase — was removed. It appeared in three places total: both header click handlers (fixed as part of the `navigate()` change above) and a `[title]` binding in `education.component.html:12` (`$safeNavigationMigration(exp?.tab)` → `exp?.tab`), fixed as the same bug class in the same pass.

## Linkified URLs in descriptions

The DBTBT.com entry's description mentions its own homepage inline as plain text — `(http://www.dbtbt.com/)` — which, since `WorkHistoryComponent` renders each description paragraph as plain interpolated text (`{{descParagraph}}`), didn't render as a clickable link no matter what scheme it used. Fixed in two parts:
- The URL itself was updated to `https://` in `config.json`.
- A new `LinkifyPipe` (`src/app/pipes/linkify/linkify.pipe.ts`, declared in `HomeModule`) finds `http(s)://` URLs in a string and wraps them in a real `<a target="_blank" rel="noopener">`, escaping the surrounding text first (so any incidental `<`/`&` in description prose can't be interpreted as markup) before trusting the result via `DomSanitizer.bypassSecurityTrustHtml`. The paragraph binding in `workhistory.component.html` changed from `{{descParagraph}}` to `[innerHTML]="descParagraph | linkify"`.

This is applied to every description paragraph site-wide (Experience, Volunteering, Projects), not just this one entry, since that's the natural way to solve "make embedded URLs clickable" for plain-text-interpolated content — but a repo-wide check confirmed the DBTBT entry is currently the only description containing an inline URL, so no other rendering changes.

## Images

The 10 real project photos referenced by the config data were copied in from `yannislam.org/src/assets/images/projects/` to `src/assets/images/projects/`, downscaled to a max 1600px dimension and re-encoded (JPEG quality ~82 for photos; the two PNGs — a chart and a screenshot — kept as PNG) to bring the total from ~30MB of original phone-camera photos down to ~1.9MB.

One photo (the Raspberry Pi timelapse controller, `20191020_053757.jpg`) came out sideways after that resize — its EXIF `Orientation` tag was `6` (rotate 90° CW to display correctly), and .NET's `System.Drawing.Image`, used for the resize/compress pass, ignores EXIF orientation entirely (unlike browsers or a photo viewer, which auto-rotate on display). It was regenerated with an explicit `RotateFlip(Rotate90FlipNone)` applied before resizing, and the stale EXIF orientation tag was stripped from the output so downstream viewers don't double-rotate it. The other 9 source files all had orientation `1` (already upright), so they weren't affected.

## Verification

- `ng build` — clean, no errors.
- Nav shows "05. Projects"; clicking it navigates to `/projects` (both desktop and mobile hamburger menu), no console errors.
- Existing scroll-anchor nav items (About/Education/Experience/Volunteering) unaffected, including scrolling back from `/projects` to a `/` section.
- `/projects` renders shared header/footer/loading-screen chrome; a master "05. What have I built?" heading clears the fixed header, followed by "5.1. College Projects" (6 entries) at a visibly smaller subsection size, alternating image/text layout, all images load and are correctly oriented, entries with a link show the external-link icon, no bare "@" under any project title. `#projects-highschool` is confirmed absent from `/projects`'s DOM.
- Clicking "View High School Projects" navigates to `/projects/highschool`, landing at the top of the page (not the prior scroll offset), showing "5.2. High School Projects" and a "← Back to Projects" link that returns to `/projects`. Direct-loading `/projects/highschool` (full page load, not client nav) renders identically.
- Every project description renders as complete, properly-bounded paragraphs — no mid-sentence line breaks.
- The "View High School Projects" button renders as a proper single box around both wrapped lines on mobile (375px), not just the first line.
- About section profile photo on mobile (≤500px) now renders in correct portrait (3:4) proportions instead of squished into a square; decorative border box aligned to the photo edges.
- Education tabs unaffected by the `$safeNavigationMigration` fix there.

## Files touched

- `src/assets/config.json` — `projects` key reshaped to a master `{ sectionId, navNumber, headingText }` envelope plus `college`/`highschool` sub-envelopes; description text rejoined into proper paragraphs and typos fixed; DBTBT URL updated to `https://`; new `siteMenu` entry.
- `src/app/services/site-config/site-config.service.ts` — added `projects` accessor.
- `src/app/components/home/projects/projects.component.ts` / `.html` / `.scss` — new; renders the master heading, College Projects, and the CTA link to High School Projects.
- `src/app/components/home/projects-highschool/projects-highschool.component.ts` / `.html` / `.scss` — new; the High School Projects sub-page.
- `src/app/pipes/linkify/linkify.pipe.ts` — new; turns `http(s)://` URLs in description text into real links.
- `src/app/components/home/home.module.ts` — declared both new components and `LinkifyPipe`; added `RouterModule` to imports.
- `src/app/app-routing.module.ts` — new `/projects` and `/projects/highschool` routes; `scrollPositionRestoration: 'enabled'`.
- `src/app/components/general/header/header.component.ts` / `.html` — `navigate(menuItem)` method; both menu loops updated; stray `$safeNavigationMigration` calls removed.
- `src/app/components/home/education/education.component.html` — same stray-bug fix.
- `src/app/components/home/workhistory/workhistory.component.ts` / `.html` / `.scss` — added `subsection` input/style; guarded the `organization` line; description paragraphs now go through `linkify`.
- `src/app/components/home/about/about.component.scss` — consolidated the two duplicate mobile media queries into one that preserves the profile photo's portrait ratio and adds `object-fit: cover`.
- `src/assets/images/projects/` — 10 new images (resized/compressed; one corrected for EXIF rotation).
