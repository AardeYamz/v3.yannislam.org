Date: 2026-07-28 16:02:03

# Config Deduplication & Loading Efficiency Refactor

Reduces repeated boilerplate around reading `src/assets/config.json` and
duplicated animation code across components, and splits the rarely-visited
`/aardeyamz` route out of the initial bundle.

## Problem

Seven components each carried their own copy of:

```ts
import * as jsonData from '../../../../assets/config.json';
// ...
data: any = jsonData;
```

with a different number of `../` segments depending on how deep the component
lived (`components/home/about/` vs `components/other/aardeyamz/namecard/`,
etc.) — fragile, and every one of them re-parsed the same import path. On top
of that, `banner`, `header`, and `footer` each hand-rolled an identical
fade-in/stagger Angular animation trigger that only differed in the transform
origin, and several components carried dead code (`implements OnInit` with an
empty body; an `EducationComponent.sectionTitle` field that existed only to
feed a leftover `console.log`).

Separately, `AppModule` eagerly imported `AardeYamzModule` — a since-emptied
`NgModule` left over from before `AardeYamzComponent` became standalone — so
that route's component tree shipped in the main bundle even though almost no
visitor hits `/aardeyamz`.

## Changes

### `SiteConfigService`

`src/app/services/site-config/site-config.service.ts` — the only remaining
import of `config.json` in the app. `providedIn: 'root'`, following the same
pattern as the existing `ThemeService`/`AnalyticsService`:

```ts
@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  readonly data: any = siteConfig;
  readonly menu: any[] = this.data.siteMenu;
  readonly experiences: any = this.data.about.experiences;
  readonly contacts: any[] = this.data.about.contact;
}
```

`HomeComponent`, `AboutComponent`, `BannerComponent`, `EducationComponent`,
`FooterComponent`, `HeaderComponent`, and `NamecardComponent` now inject this
instead of importing the JSON file directly. Components whose templates
reference `data.xxx` keep a `get data()` passthrough so no template markup had
to change; components that only needed a slice (`menu`, `experiences`,
`contacts`) take just that.

### `fadeStaggerAnimation` helper

`src/app/animations/fade-stagger.animation.ts` factors out the trigger shared
by `bannerTrigger`, `animateMenu`, and `animateFooter`:

```ts
export function fadeStaggerAnimation(name: string, fromTransform: string): AnimationTriggerMetadata
```

Each component now declares its trigger in one line, e.g.
`fadeStaggerAnimation('bannerTrigger', 'translateX(-50px)')`.

### Banner copy moved into `config.json`

The hardcoded `<h1>Hello! My name is</h1>` / `<h2>Yannis Lam;</h2>` in
`banner.component.html` moved into `config.json`'s existing `banner` object as
`greeting` and `name`, alongside the `blurb`/`typeSection` fields that were
already sourced from there:

```json
"banner": {
  "greeting": "Hello! My name is",
  "name": "Yannis Lam;",
  "blurb": [ ... ],
  "typeSection": [ ... ]
}
```

### Dead code removed

- `EducationComponent`: dropped the unused `sectionTitle` field (only ever
  read by a leftover `console.log`).
- Empty `implements OnInit` / `ngOnInit(): void {}` removed from `about`,
  `banner`, `footer`, `header`, `contact`, `namecard`.
- Deleted `aardeyamz.module.ts` — nothing declared into it after
  `AardeYamzComponent`/`NamecardComponent` went standalone.

### Lazy-loaded `/aardeyamz` route

`app-routing.module.ts` now points that route at `loadComponent` instead of a
static import, so it ships as its own chunk:

```ts
{
  path: 'aardeyamz',
  loadComponent: () => import('./components/other/aardeyamz/aardeyamz.component').then(m => m.AardeYamzComponent)
}
```

## Verification

- `ng build` (development and production configurations) — both clean.
  Production build confirms `/aardeyamz` now emits as a separate lazy chunk
  (~6.8 kB transfer) instead of being folded into the initial bundle.
- `ng test` — 5 passing / 7 failing, identical pass/fail split confirmed on
  unmodified `main` before this refactor. The failures are pre-existing spec
  setup gaps (missing `NgbModule`/`ngx-typed-js`/animation providers in
  isolated `TestBed` configs) unrelated to this change.
- `grep` for `jsonData`/`assets/config.json` across `src/` confirms
  `SiteConfigService` is now the only remaining direct reference.

## Files touched

- `src/app/services/site-config/site-config.service.ts` — new.
- `src/app/animations/fade-stagger.animation.ts` — new.
- `src/app/components/home/{home,about,banner,education,contact}.component.ts`
- `src/app/components/home/banner/banner.component.html`
- `src/app/components/general/{header,footer}/*.component.ts`
- `src/app/components/other/aardeyamz/namecard/namecard.component.ts`
- `src/app/components/other/aardeyamz/aardeyamz.module.ts` — deleted.
- `src/app/app.module.ts`, `src/app/app-routing.module.ts`
- `src/assets/config.json` — added `banner.greeting` / `banner.name`.
