Date: 2026-07-27 21:45:49

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
- **`about.experiences.work` / `about.experiences.volunteering`**: both were changed from a bare array to an object carrying the section's own display metadata alongside its entries:
  ```json
  "work": {
    "sectionId": "workhistory",
    "navNumber": "03.",
    "headingText": "What's my experience?",
    "list": [ /* ...existing work entries... */ ]
  },
  "volunteering": {
    "sectionId": "volunteering",
    "navNumber": "04.",
    "headingText": "How do I give back?",
    "list": [ /* Epic Movement, ARISE Youth Ministries */ ]
  }
  ```
  (`education` and `skills` are untouched — still plain arrays, since nothing about their rendering changed.) The Volunteering entries' `imgs` fields were also converted from a bare string to a single-element array (`"imgs": ["..."]`) to match the shape `WorkHistoryComponent`'s template expects (`exp.imgs[0]`, and iteration over `exp.imgs` for the carousel). The ARISE entry was sourced from the legacy `yannislam.org/config.js` site, which listed both organizations under `experience`.

## Component: `WorkHistoryComponent` reused as a plain, data-driven component

The Volunteering entries (`organization`, `title`, `timeframe`, `imgs`, `link`, `description`) are structurally the same shape as the `work` entries the Experience section already renders — so rather than adding a fourth component, both sections render through the same `WorkHistoryComponent` (`src/app/components/home/workhistory/`).

An earlier pass had the component pick its own data via an `@Input() section: 'work' | 'volunteering'` resolved against an internal `sectionConfigs` lookup table in `ngOnInit`. That put a routing/branching decision inside a component that should just render whatever it's given. It was removed — `WorkHistoryComponent` now has **no knowledge of "work" or "volunteering" at all** and no config import; it's four plain inputs:

```ts
@Input() experienceList: any[] = [];
@Input() sectionId = '';
@Input() navNumber = '';
@Input() headingText = '';
```

The template already bound to these fields (`[id]="sectionId"`, `{{navNumber}}`, `{{headingText}}`, `experienceList` in the `@for`) from the earlier pass, so no template changes were needed here — only the `.ts` file lost its `sectionConfigs` map, the `WorkHistorySectionConfig` interface, the `section` input, the `jsonData` import, and `ngOnInit`.

The decision of *which* data feeds each instance now lives entirely in the parent, `home.component.ts`, which just reads `config.json` and exposes it:

```ts
export class HomeComponent {
  data: any = jsonData;
  experiences: any = this.data.about.experiences;
}
```

`home.component.html` binds each section's own `sectionId` / `navNumber` / `headingText` / `list` straight from config — no string matching, no lookup table, no conditional:

```html
<app-workhistory
  [experienceList]="experiences.work.list"
  [sectionId]="experiences.work.sectionId"
  [navNumber]="experiences.work.navNumber"
  [headingText]="experiences.work.headingText">
</app-workhistory>
<app-workhistory
  [experienceList]="experiences.volunteering.list"
  [sectionId]="experiences.volunteering.sectionId"
  [navNumber]="experiences.volunteering.navNumber"
  [headingText]="experiences.volunteering.headingText">
</app-workhistory>
```

Adding a future third instance (say, another `work`-shaped section) is now just another config.json object plus another `<app-workhistory>` binding — no code change to the component or a lookup table to extend.

### Earlier iterations (superseded)

1. A standalone `VolunteeringComponent` modeled on `EducationComponent`'s tabbed layout (`src/app/components/home/volunteering/`) — removed once it was clear the data matched `WorkHistoryComponent`'s shape closely enough to share the component outright.
2. `WorkHistoryComponent` with an internal `section` input + `sectionConfigs` lookup table — removed per this refactor, in favor of the parent-resolved plain-input design described above.

## Verification

- `ng build` — clean, no errors, after each iteration.
- `ng serve` + Playwright: confirmed the nav renders `01. About | 02. Education | 03. Experience | 04. Volunteering`; the Volunteering section renders both organizations (Epic Movement — President, 08/2020–05/2021; ARISE Youth Ministries — Youth Counselor, 07/2018–08/2019) with correct headings, descriptions, and links; the Experience section is unaffected (still renders all 9 entries); zero console errors.

## Files touched

- `src/assets/config.json` — nav entry; `work`/`volunteering` restructured from arrays to `{ sectionId, navNumber, headingText, list }` objects; `volunteering` entries' `imgs` shape fix.
- `src/app/components/home/workhistory/workhistory.component.ts` — reduced to four plain `@Input()`s, no config import, no branching logic.
- `src/app/components/home/home.component.ts` — now reads `config.json` and exposes `experiences`.
- `src/app/components/home/home.component.html` — two `<app-workhistory>` instances, each bound explicitly to its section's config data.
