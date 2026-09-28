Date: 2026-09-28 07:49:55

# Typed SiteConfig model

Fifth PR out of `docs/todo/code-review-optimization.md`'s suggested
grouping: "#13 typed config."

## What changed

### New `site-config.model.ts`

`SiteConfigService` and every component reading from it were typed `any`
end to end — `data: any`, `menu: any[]`, `experiences: any`, component
fields like `HeaderComponent.menu: any[]`, `FooterComponent.socials: any`,
and so on. Templates compensated with `?.` guards everywhere, some needed
and some not, with no way to tell which from the code alone.

Added `src/app/services/site-config/site-config.model.ts` with interfaces
for every shape `config.json` actually has: `MenuItem`, `Logo`, `Contact`,
`AardeYamzCard`, `Experience`, `ExperienceSection`, `Experiences`,
`AboutConfig`, `Banner`, `FooterConfig`, `Project`, `ProjectSection`,
`ProjectsConfig`, `SiteConfig`, plus a `WorkHistoryEntry` type (see below).

These describe the data **as it actually is**, not as it "should" be —
`config.json` has no schema validation (per `CLAUDE.md`), and reading the
real file surfaced two genuine inconsistencies worth encoding rather than
"fixing" as a drive-by:

- `Experience.link` is typed `string | string[]`. Most entries store a
  single external link as a one-element array
  (`"link": ["https://www.voya.com/"]`), several store a bare string
  (`"link": "https://epicmovement.com/"`). Normalizing `config.json`
  itself is a content edit, not this refactor's job.
- `MenuItem.navNumber` is optional. Every *rendered* nav item has one
  (`SiteConfigService.menu` filters out `hidden` entries), but the raw
  AardeYamz easter-egg entry in `config.json`'s `siteMenu` doesn't — and
  the model describes `data.siteMenu` too, not just the filtered `menu`.

### `SiteConfigService`

- `data: SiteConfig` (was `any`), plus real types on `logos`, `menu`,
  `experiences`, `contacts`, `projects`, `footer`.
- Switched `import * as siteConfig from '../../../assets/config.json'` to
  a default import (`import config from '...'`) — supported here since
  `tsconfig.json` already sets `esModuleInterop`/`resolveJsonModule`.
- `resolveLogoKeys()` is now a pure function. It used to mutate the
  `logoKey`-bearing objects in place (`value.imgs = [...]`) — and since
  `value` is the imported `config.json` module (transitively), that meant
  mutating the module's own object graph, a footgun for HMR and any test
  that imports the module more than once. Rewrote it to return new
  objects (`{ ...resolved, imgs: [...], image_alt: ... }`) at every level
  instead. Added a test that imports `config.json` fresh and confirms a
  `logoKey`-bearing entry there still has no `imgs`/`image_alt` — the
  thing a mutating implementation would have left behind.

### Components

Typed every component field that holds config-sourced data instead of
`any`: `HeaderComponent.menu` (`MenuItem[]`) and `navigate()`'s parameter
(`Partial<MenuItem>` — the existing tests call it with partial objects,
and the method already treats it defensively via `?.` throughout, so
that's the honest type). `FooterComponent.socials`/`mobileSocials`
(`Contact[]`), `.email` (`Contact`, via a non-null assertion — Email is
always in `config.json`'s contact list per `CLAUDE.md`'s "Add a New
Social Link" section), `.footer` (`FooterConfig`). `EducationComponent`/
`HomeComponent.experiences` (`Experiences`). `ProjectsComponent.projects`
(`ProjectsConfig`). `ProjectsHighschoolComponent.highschool`
(`ProjectSection`).

`AboutComponent`/`BannerComponent`/`NamecardComponent` needed no changes:
they expose `configService.data` through a `get data()` accessor rather
than declaring their own `any` field, so they picked up the real
`SiteConfig` type automatically once the service was typed.

**`WorkHistoryComponent.experienceList`** is the one that doesn't fit a
single existing type: it's reused for both `Experience[]` (work/
volunteering, via `home.component.html`) and `Project[]` (college
projects, via `projects.component.html`) — see the component's own doc
comment, added here. A plain union (`Experience | Project`) doesn't work:
the template unconditionally accesses fields like `exp.organization`
that `Project` doesn't have *at all* (not even optional), which is a
real type error on the union, not a false positive. Added
`WorkHistoryEntry` instead — the three fields both shapes truly share as
required (`title`, `timeframe`, `description`), everything else optional.
Both `Experience` and `Project` already satisfy it structurally; no
`extends` needed.

### Real bugs strictTemplates caught

Per the backlog's own prediction ("`strictTemplates` will point out real
mistakes"), two things surfaced once real types were flowing:

1. **`workhistory.component.html` bound `exp.organization` and
   `exp.imgs[0]` directly** to directive inputs (`appLogoFallback`,
   `appLogoFallbackBg`) that require a plain `string`. `organization` is
   genuinely absent for `Project` entries (no fallback needed before —
   `any` silently passed `undefined` through), and `imgs` is optional
   pre-`resolveLogoKeys()` in the type even though every real entry ends
   up with one. Added `|| ''` fallbacks at each binding site rather than
   loosening the directives' input types, matching the pattern already
   used one line over (`exp.image_alt || exp.title`).
2. **Two component specs' mocks were wrong.** `projects.component.spec.ts`
   and `projects-highschool.component.spec.ts` mocked `projects.college`/
   `projects.highschool` as plain arrays of project objects
   (`college: [{ title: ..., ... }]`), but the real shape (confirmed by
   reading both components' actual templates, which access
   `projects.college.list`/`.sectionId`/`.navNumber`/`.headingText`) is a
   `ProjectSection` object with a `.list` array inside. The `any`-typed
   service let this pass unnoticed since nothing ever checked the mock
   against a real shape — under `WorkHistoryEntry`/`ProjectsConfig`
   typing, the mismatch became a compile error. Fixed both mocks and their
   assertions to match the real shape.

## Test plan

- `npm test` — 151/151 (150 existing + 1 new purity test for
  `resolveLogoKeys`).
- `npm run build` succeeds with zero template/type errors —
  `strictTemplates` compiles cleanly across every component now reading
  typed config data.
