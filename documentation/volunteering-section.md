# Volunteering Section

A fourth homepage section, "04. Volunteering," was added alongside the existing About / Education / Experience sections, listing Epic Movement at UMass Amherst and ARISE Youth Ministries.

## Data

`src/assets/config.json` gained two additions:

- **`siteMenu`**: a new nav entry (before the `AardeYamz` link) so the header shows "04. Volunteering" and scrolls to the section:
  ```json
  {
    "navID": 4,
    "navNumber": "04. ",
    "navTitle": "Volunteering",
    "navContent": "How do I give back?",
    "scrollSection": "volunteering",
    "siteLocation": "/#volunteering"
  }
  ```
- **`about.experiences.volunteering`**: already existed with a single Epic Movement entry (unused by the app until now — see "Before this change" below). A second entry for ARISE Youth Ministries was added, sourced from the legacy `yannislam.org/config.js` site (which listed both organizations under `experience`). Both entries' `imgs` fields were converted from a bare string to a single-element array (`"imgs": ["..."]`) to match the shape `WorkHistoryComponent`'s template expects (`exp.imgs[0]`, and iteration over `exp.imgs` for the carousel).

## Component: reusing `WorkHistoryComponent` instead of adding a new one

The Volunteering entries (`organization`, `title`, `timeframe`, `imgs`, `link`, `description`) are structurally the same shape as the `work` entries the Experience section already renders — so rather than adding a fourth component, `WorkHistoryComponent` (`src/app/components/home/workhistory/`) was made to render **either** section, selected by a new `@Input() section: 'work' | 'volunteering'`:

```ts
@Input() section: 'work' | 'volunteering' = 'work';

sectionConfigs: Record<string, WorkHistorySectionConfig> = {
  work: { sectionId: 'workhistory', navNumber: '03.', headingText: "What's my experience?", experienceList: this.data?.about?.experiences?.work },
  volunteering: { sectionId: 'volunteering', navNumber: '04.', headingText: 'How do I give back?', experienceList: this.data?.about?.experiences?.volunteering }
};
```

`ngOnInit` resolves the active config into plain `sectionId` / `navNumber` / `headingText` / `experienceList` fields that the template binds to (previously these were hardcoded: `id='workhistory'`, the literal text `03.` / `What's my experience?`, and `data?.about?.experiences?.work` directly).

`home.component.html` now renders two instances:

```html
<app-workhistory></app-workhistory>                       <!-- section="work" (default) -->
<app-workhistory section="volunteering"></app-workhistory>
```

One template/stylesheet pair now drives both sections — no visual or behavioral difference between them (same alternating image/text carousel layout, same CSS classes). The only template change beyond parameterization was wrapping the `workhistory-skills` list in `@if (exp?.skills)`, since volunteering entries don't have a `skills` field (education/work entries do).

### Before this change

An earlier version of this work added a standalone `VolunteeringComponent` modeled on `EducationComponent`'s tabbed layout (`src/app/components/home/volunteering/`). It was removed in favor of the approach above once it was clear the data already matched `WorkHistoryComponent`'s shape closely enough to share the component outright, rather than maintaining two nearly-identical implementations.

## Verification

- `ng build` — clean, no errors.
- `ng serve` + Playwright: confirmed the nav renders `01. About | 02. Education | 03. Experience | 04. Volunteering`; the Volunteering section renders both organizations (Epic Movement — President, 08/2020–05/2021; ARISE Youth Ministries — Youth Counselor, 07/2018–08/2019) with correct headings, descriptions, and links; the Experience section is unaffected (still renders all 9 entries); zero console errors from application code.

## Files touched

- `src/assets/config.json` — nav entry + ARISE entry + `imgs` shape fix.
- `src/app/components/home/workhistory/workhistory.component.ts` — `@Input() section`, `sectionConfigs` map.
- `src/app/components/home/workhistory/workhistory.component.html` — parameterized `id`/heading/data source, guarded `skills` block.
- `src/app/components/home/home.component.html` — second `<app-workhistory>` instance.
