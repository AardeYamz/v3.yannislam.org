# Runtime perf: lazy-loaded project routes + OnPush change detection

## Context

Two independent runtime-perf changes, done together since both touch the
same component set:

1. `/projects` and `/projects/highschool` were the only two routes still
   eagerly bundled into `main.js` — `/aardeyamz` already used `loadComponent`.
   Convert both to lazy routes.
2. No component in the app set `changeDetection`, so every component ran
   Angular's default (`ChangeDetectionStrategy.Eager` — the current name for
   what used to be called `Default`) strategy: every component gets
   re-checked on every change-detection pass, app-wide, regardless of
   whether its own inputs/state actually changed. Move every component
   under `src/app/components` (plus `AppComponent`) to `OnPush`.

## Part A — lazy-loading `/projects` and `/projects/highschool`

`loadComponent` requires the routed component to be standalone.
`ProjectsComponent` and `ProjectsHighschoolComponent` were both
`standalone: false`, declared in `HomeModule`
(`src/app/components/home/home.module.ts`) alongside the rest of the home
page's components — so before they could be lazy-routed, they had to be
pulled out of that module and converted.

Changes:

- `src/app/app-routing.module.ts` — `/projects` and `/projects/highschool`
  now use `loadComponent: () => import(...).then(m => m.XComponent)`, same
  pattern as the existing `/aardeyamz` route. The now-unused static imports
  of `ProjectsComponent`/`ProjectsHighschoolComponent` were removed.
- `src/app/components/home/projects/projects.component.ts` and
  `src/app/components/home/projects-highschool/projects-highschool.component.ts`
  — both converted to `standalone: true`, with an explicit `imports` array
  covering what their templates actually reference:
  - `RouterModule` — both templates use `[routerLink]` (back-link on the
    highschool page, "View High School Projects" link on the main page).
  - `AosDirective` (`src/app/directives/aos/aos.directive.ts`) — both
    templates use `data-aos`/`data-aos-duration` scroll-reveal attributes;
    the directive is already standalone (no `standalone: false` on it), so
    it can be imported directly.
  - `HomeModule` — both templates use `<app-workhistory>`
    (`WorkHistoryComponent`), which stays `standalone: false` and declared
    in `HomeModule` (out of scope for this change — see Part B for why it
    was still safe to move to OnPush without converting it to standalone).
    A standalone component can only get template access to a
    non-standalone declarable via the `NgModule` that **exports** it, so
    `HomeModule`'s `exports` array gained `WorkHistoryComponent` (it was
    already exporting `ContactComponent` for the same reason). This is the
    one line in `home.module.ts` that isn't a pure removal — everything
    else in that module (its other declarations, imports, and
    `ContactComponent`'s export) is untouched.

  Neither template uses any `CommonModule`-provided pipe/directive
  (`*ngIf`, `*ngFor`, `NgClass`, `NgStyle`, `date`, etc. — both are on the
  new `@if`/`@for` control-flow syntax already, which is built into the
  compiler and needs no import), so `CommonModule` was left out of both
  `imports` arrays rather than added unconditionally.
- `home.module.ts` — `ProjectsComponent` and `ProjectsHighschoolComponent`
  removed from `declarations`. They were never in `exports` (routed
  components only, never used as a tag anywhere else), so no export
  changes were needed for them specifically. Their imports were removed
  from the top of the file. Everything else in the module (declarations,
  imports, the `ContactComponent` export) is unchanged.

Because `HomeModule` is still imported eagerly by `AppModule` (it backs the
`/` route), `WorkHistoryComponent` — and the rest of `HomeModule` — stays in
the main bundle either way; importing `HomeModule` from the new lazy chunks
doesn't pull anything extra into them, it just lets the lazy chunk reference
code that's already in the shared/main chunk instead of duplicating it.

Build output confirms both are now separate lazy chunks alongside the
existing `aardeyamz` one:

```
Lazy chunk files      | Names
chunk-*.js            | aardeyamz-component
chunk-*.js            | projects-component
chunk-*.js            | projects-highschool-component
```

## Part B — OnPush across `src/app/components`

Went one component at a time, checking each template/class for state that
OnPush wouldn't otherwise pick up (timers, native DOM/event-listener
callbacks outside Angular's binding flow, in-place mutation of
arrays/objects read by the template).

**Converted with no other changes needed** (state only changes via
`@Input` reference changes, template-bound `(click)`/other DOM event
bindings, `[(ngModel)]`/`ngbNav`-style two-way bindings, or signals read
directly in the template — all of which mark an OnPush view dirty on their
own):

- `AppComponent` (`app.component.ts`) — `headerReady` only flips via the
  `(finished)` output binding on `<app-loading-screen>`; an `@Output` emit
  always marks the listening (parent) view dirty, OnPush or not.
- `HeaderComponent` — `pageYPosition` is written from
  `@HostListener('window:scroll')`. `@HostListener`, including global
  targets (`window:`/`document:`), compiles to the same listener
  instruction as a template `(event)` binding and marks the component's
  view dirty when it fires, so this needed no extra work. Verified live via
  Playwright (see Verification) rather than taking that on faith, since
  it's exactly the kind of thing the task called out as a risk.
- `NamecardComponent`, `AardeYamzComponent`, `HomeComponent`,
  `ProjectsComponent`, `ProjectsHighschoolComponent`, `EducationComponent`,
  `ContactComponent`, `BannerComponent`, `AboutComponent`, `FooterComponent`,
  `WorkHistoryComponent` — all render config data pulled once from
  `SiteConfigService` (a static, build-time `config.json` import — no
  async source) plus template-bound click handlers
  (`AnalyticsService`/`ResumeService` calls) and/or ngbNav two-way
  bindings (`EducationComponent`'s `[(activeId)]`). No timers, no
  out-of-band mutation of anything the template reads.

**Converted with a `ChangeDetectorRef.markForCheck()` fix** (state changes
from outside Angular's own event-dispatch path):

- `FloatingLogosComponent` — its constructor `effect()` re-shuffles each
  logo's `variant` field (`reshuffleColors()`) in place, in response to
  `ThemeService`'s theme-mode signal changing. That's a template-bound
  field (`[src]="'...' + logo.variant + '...'"`), mutated in place rather
  than via a new array/object reference, from inside a constructor
  `effect()` — which runs off the signal reactive graph, not from a
  template-bound DOM event — so under OnPush the view wasn't being
  re-checked after the mutation. Fixed by injecting `ChangeDetectorRef` and
  calling `markForCheck()` right after `reshuffleColors()` inside the
  effect. (The rAF-driven per-frame `render()` loop that positions each
  logo is untouched — it writes `el.style.transform` straight to the DOM
  via `ElementRef`, bypassing Angular bindings entirely, so it was never
  affected by change-detection strategy either way.)
- `LoadingScreenComponent` — `hidden` (which gates
  `[class.loading-screen--hidden]` on the overlay, i.e. the fade-out that
  actually removes the boot-time loading screen from view) is set inside
  `playOutro()`'s animejs `onComplete` callback — a third-party animation
  library callback, not an Angular-bound event. Under OnPush this field
  flip wasn't marking the view dirty, which meant the overlay would set
  the class but the change would never actually be reflected in the DOM —
  i.e. **the loading screen would never visibly go away**. Fixed the same
  way: injected `ChangeDetectorRef`, call `markForCheck()` right after
  `this.hidden = true`.

**Not skipped** — every component in the task's list ended up convertible;
none were judged too risky to do correctly in the time available. The two
fixes above were exactly the kind of "state changes outside Angular's
normal binding flow" the task flagged as the main risk, and both were
verified live (see below) rather than assumed safe.

Other native-callback code paths in the tree were checked and found to
need no changes because they never touch anything Angular-bound in the
first place: `AosDirective`'s `IntersectionObserver` callback and
`LogoFallbackDirective`'s theme-driven `effect()` both write straight to
`nativeElement` (`classList.toggle(...)`, `.src = ...`), never through a
template binding, so they're unaffected by any host component's change
detection strategy regardless of OnPush.

## Files touched

- `src/app/app-routing.module.ts` — lazy `loadComponent` for
  `/projects` and `/projects/highschool`.
- `src/app/components/home/home.module.ts` — removed
  `ProjectsComponent`/`ProjectsHighschoolComponent` declarations + their
  imports; added `WorkHistoryComponent` to `exports`.
- `src/app/components/home/projects/projects.component.ts`,
  `src/app/components/home/projects-highschool/projects-highschool.component.ts`
  — standalone conversion + OnPush.
- `ChangeDetectionStrategy.OnPush` added to: `src/app/app.component.ts`,
  `src/app/components/general/header/header.component.ts`,
  `src/app/components/general/loading-screen/loading-screen.component.ts`
  (+ `ChangeDetectorRef.markForCheck()` fix),
  `src/app/components/general/footer/footer.component.ts`,
  `src/app/components/other/aardeyamz/aardeyamz.component.ts`,
  `src/app/components/other/aardeyamz/namecard/namecard.component.ts`,
  `src/app/components/home/workhistory/workhistory.component.ts`,
  `src/app/components/home/education/education.component.ts`,
  `src/app/components/home/home.component.ts`,
  `src/app/components/home/contact/contact.component.ts`,
  `src/app/components/home/banner/banner.component.ts`,
  `src/app/components/home/about/about.component.ts`,
  `src/app/components/home/floating-logos/floating-logos.component.ts`
  (+ `ChangeDetectorRef.markForCheck()` fix).

## Verification

- `ng build` — clean, no TypeScript/template errors. Lazy chunk output
  confirms `projects-component` and `projects-highschool-component` are
  now separate chunks (previously part of `main.js`).
- `ng serve` + headless-Chromium (Playwright) pass over `/`, `/projects`,
  `/projects/highschool`, `/aardeyamz`, checking `console`/`pageerror`
  events throughout:
  - `/`: loading screen's `.loading-screen--hidden` class was confirmed to
    actually appear after the intro plays (the `markForCheck()` fix —
    without it this would stay stuck visible).
  - Scrolled the page: header picked up `.nav-shadow` and the logo's
    `rotate(...)` transform advanced, confirming the `@HostListener`
    scroll handler still drives the view under OnPush with no extra code.
  - Floating logos: confirmed their `style.transform` (rAF loop) keeps
    changing over time, unaffected either way as expected.
  - Theme toggle: confirmed `data-theme`, the toggle icon class, and —
    the specific regression risk — all 34 floating logos' `<img src>`
    changed after a toggle (the `markForCheck()` fix in
    `FloatingLogosComponent`; without it these would stay frozen on their
    initial colors after the first theme change).
  - Mobile drawer: at a 480px viewport, confirmed the hamburger toggles
    `.aside-show` on the drawer open/close.
  - `/projects` and `/projects/highschool`: confirmed workhistory sections
    and their `owl-carousel-o` carousels render (6 and 4 entries
    respectively), and the highschool page's back-link and the projects
    page's "View High School Projects" link are present. (This dataset's
    `config.json` gives every project a single image, so there's nothing
    for the carousels to advance between — slide-navigation itself wasn't
    materially exercisable, but the carousel component renders and the
    surrounding OnPush `WorkHistoryComponent`/`ProjectsComponent` don't
    interfere with it.)
  - `/aardeyamz`: confirmed the namecard sections render (3 entries).
  - No `pageerror` events on any page. The only `console.error` entries
    seen were `net::ERR_TUNNEL_CONNECTION_FAILED` for
    `googletagmanager.com` (the analytics `<script>` in `index.html`) —
    this sandbox's network proxy blocks that external host; unrelated to
    this change and not present in a normal deployment.
