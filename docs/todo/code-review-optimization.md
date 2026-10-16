# Code Review: Optimization & Refactoring Backlog

A review of `src/app/**`, `scripts/`, and build/SW config as of `f351ba3`.
Written as a work plan for another agent: each item says what's wrong, where,
what to do, and how to verify it. Items are ordered by payoff and grouped so
that each group can ship as its own PR.

## Ground rules for whoever picks this up

- Read `CLAUDE.md` first. Content stays in `src/assets/config.json`, accessed only
  through `SiteConfigService`.
- **SSR/prerender safety:** every route is prerendered (`app.routes.server.ts`).
  Any browser API (`window`, `document`, `IntersectionObserver`, `Image`,
  `matchMedia`) has to stay behind `isPlatformBrowser`. Don't change
  the loading-screen/`headerReady` hydration logic without reading the comments
  in `app.component.ts`, `loading-screen.component.ts`, and `utils/hydration.ts`.
  They record bugs that were already fixed once.
- **Zoneless + OnPush:** state written outside a template event (scroll
  listeners, observers, rAF, third-party callbacks) has to be a signal, or
  followed by `markForCheck()`.
- For each change, write a `docs/changes/YYYYMMDD-HHMMSS-slug.md` entry, following the naming rule in `CLAUDE.md`.
- Verify with `npm test`, `npm run build`, and `npm run test:e2e`. Where it
  applies, also compare `npm run test:perf` against a run on `main`.
- The existing comments are long and explain *why* the code works the way it does. Keep them. When you
  change the behavior a comment describes, update the comment too.

---

## P0: Bugs and big wins (do first)

### 1. The About photo is a 3.6 MB JPEG shown at 300×400
- `src/app/components/home/about/about.component.html:42-43` loads
  `assets/images/profiles/profile4.jpg` (3.6 MB). This is probably the biggest cost on
  the home page for LCP and bytes transferred.
- **Do:** export a resized image at about 600×800 for 2x DPR, as AVIF/WebP plus a JPEG fallback
  (`<picture>` or `srcset`). Target under 100 KB. Add `loading="lazy"` and
  `decoding="async"`, since the image is below the fold. Consider `NgOptimizedImage` (`ngSrc`).
- `profiles/` also has `profile0.jpg` (1.8 MB), `profile1.jpg` (3.7 MB),
  `profile2.jpeg`, `profile3.jpg`, and `profileedit.png` (3.4 MB). Nothing references them
  (`grep -rn profile src`). They add about 10 MB to the repo and to `dist/`. Confirm
  with the owner, then delete them or move them out of `src/assets`.
- Look through `src/assets/images/projects/` and `logos/` for other files over 300 KB.

### 2. The GA placeholder is probably not replaced in prerendered sub-routes
- `scripts/inject-env.js` only rewrites `dist/v3.yannislam.org/browser/index.html`.
  With `outputMode: "server"` and every route set to `RenderMode.Prerender`, the build also writes
  `browser/projects/index.html`, `browser/projects/highschool/index.html`,
  `browser/aardeyamz/index.html`, and `browser/index.csr.html`. Those probably
  still contain the literal `%GOOGLE_ANALYTICS_ID%`, which means GA is broken on direct loads of those
  routes.
- **Verify first:** `npm run build && grep -rl '%GOOGLE_ANALYTICS_ID%' dist/`.
- **Fix:** walk `DIST_DIR` recursively and patch every `*.html` file. Also consider the
  `server/` output if it contains `index.server.html`.

### 3. `target="_black"` typo
- `src/app/components/home/banner/banner.component.html` "email me!" link:
  `target="_black"` should be `_blank`. It's a `mailto:` link, so the simplest fix is
  to drop `target` altogether.

### 4. The header navigates to a route that doesn't exist
- `header.component.ts:155`: `this.router.navigate(['/home'])`. There is no `/home`
  route, so this only works because the `**` route redirects to `/`. Change it to
  `navigate(['/'])`. The scroll then runs before `HomeComponent` has rendered, so
  wait for a render (`afterNextRender`) or retry instead of scrolling immediately.

---

## P1: Runtime performance

### 5. Every scroll event re-renders the header and forces layout reads
- `header.component.ts:195-217`: `@HostListener('window:scroll')` writes a plain
  field. The host listener marks the OnPush view dirty on **every scroll event**,
  and the template then calls the `logoRotationDeg` getter, which reads
  `document.documentElement.scrollHeight` and `window.innerHeight`. That's a
  forced layout read during change detection on every scroll event.
- `footer.component.ts:55-67` does the same (scroll and resize, with a `scrollHeight` read).
- **Do (pick one):**
  - Best: set the logo rotation with a CSS scroll-driven animation
    (`animation-timeline: scroll()`), with `@supports` fallback to the JS path. No JS on scroll.
  - Otherwise, use one passive scroll listener outside the template, throttled with rAF, and
    write to signals (`scrollY`, `maxScroll`). Cache `maxScroll` and recompute it only
    on resize or with a `ResizeObserver` on `document.body`. Turn `logoRotationDeg` and
    `pageYPosition > 0` into `computed()`s.
  - For the footer's `atBottom`, an `IntersectionObserver` on a sentinel at the end
    of the page replaces the scroll math entirely.
- Consider a small shared `ScrollService` (signals: `y`, `atBottom`) that
  header, footer, and `LinkPreviewService` all use, instead of three separate window listeners.

### 6. Every Owl carousel autoplays, including hidden ones
- `workhistory.component.ts:19-28` / `.html:14-23, 85-94`: every experience
  entry renders an `owl-carousel-o` with `autoplay: true, loop: true`, and
  *also* renders a static `img-feature-workhistory-container` with the same image.
  Check the SCSS: one of the two is presumably hidden at each breakpoint. Autoplay timers
  keep running for hidden carousels and for entries that are off-screen.
- Most entries have **one** image (`imgs = [logo.src]` from `logoKey`), so the
  carousel does nothing useful for them.
- **Do:** render the carousel only when `exp.imgs.length > 1`. Otherwise
  render the static image. Also look at whether `ngx-owl-carousel-o`, and its two
  global CSS files in `angular.json` `styles`, can be removed completely (for example with a CSS
  scroll-snap strip for the few multi-image entries). That removes a dependency
  plus its jQuery-free-but-heavy runtime.

### 7. `ngx-typed-js` for one typewriter line
- `banner.component.html:12`. The typed.js wrapper hasn't been maintained for years, and
  it needs the `isBrowser` workaround for SSR. A signal-driven typewriter of about 40 lines
  (or a CSS `steps()` animation) would remove a dependency and the SSR special case.
  Respect `prefers-reduced-motion`.

### 8. `LinkPreviewService` leaks timers and adds a global listener
- `link-preview.service.ts:127`: every `show()` schedules `setTimeout(fail, 2600)`
  and never clears it. `fail` also doesn't check `token`. It's harmless now, but store the handle and
  clear it in `hide()` and in the next attempt.
- `:186` adds a capture-phase scroll listener on window that is never removed. It's fine for
  a root singleton, but you could also fold it into the shared `ScrollService` from #5.
- Loading a live cross-origin iframe on hover is expensive (a full third-party page load
  per hover), and the targets (LinkedIn/GitHub/FB/IG/TikTok) almost all block
  framing. Consider a hover-intent delay (about 300 ms) before `attemptIframe`, or turn the
  iframe off for domains known to block framing (`ICON_BY_DOMAIN` keys).

### 9. Service worker caching strategy
- `ngsw-config.json`: `/assets/images/**` and `/assets/fonts/**` use
  `strategy: "freshness"` with `maxAge: 1h`. These are static, rarely changing
  assets, so `"performance"` (cache-first) with a longer `maxAge` fits better.
  Fonts could go in a lazy `assetGroup` instead.

---

## P2: Bundle and dependency trimming

### 10. Unused imports and modules
- `GeneralModule` imports `FormsModule` and `ReactiveFormsModule` only for
  `HeaderComponent.languageFormControl`, which is never used in the template. Remove the
  field and both modules. Then check whether `@angular/forms` can come out of `package.json`
  (ng-bootstrap may still need it as a peer, so check first).
- `GeneralModule` imports `NgbNavModule`, but nothing in `general/` uses `ngbNav`.
  Only `education.component.html` does.
- `NamecardComponent` injects `Router` and never uses it.
- `AnalyticsService.sendAnalyticPageView` is never called. Either delete it, or
  wire it to `NavigationEnd` if GA4's enhanced-measurement "history change" page
  views aren't turned on. Check in the GA admin, and update the service comment in CLAUDE.md,
  which says it "fires page views on route changes".
- `@angular/localize` is in `tsconfig.app.json` `types` and `main.ts`
  (`/// <reference types="@angular/localize" />`), but there's no `i18n` or `$localize`
  usage. Remove it unless ng-bootstrap needs it (ng-bootstrap 21 no longer
  requires `$localize`, but confirm with a build).
- `src/server.ts` is the stock Express scaffold. Vercel serves `browser/` statically
  (`vercel.json` `outputDirectory`), so the server bundle is only used to run
  prerendering. Decide whether `outputMode: "static"` would work instead and
  drop `express`/`@types/express`. Check `docs/changes/20260811-013939-ssr-prerendering.md`
  for why `server` was chosen.

### 11. Font Awesome loads the full solid and brands sets
- `angular.json` `styles` includes all of `fontawesome.css`, `solid.css`, and `brands.css`,
  which pulls in every glyph's CSS and full webfonts. The site uses maybe 15 icons. Options: subset the
  webfonts, or switch to inline SVGs (`@fortawesome/angular-fontawesome` with tree-shaken
  icons, or hand-inlined SVG for about 15 icons). Measure the CSS and font bytes before and after.
  (`docs/changes/20260731-184800-css-bundle-trim.md` and `font-trimming` show what
  has already been done.)

### 12. `@angular/animations` is deprecated
- Angular 20.2+ deprecates `@angular/animations` in favor of native CSS plus
  `animate.enter` / `animate.leave`. Users: `fade-stagger.animation.ts`
  (header, banner, footer) and `BrowserAnimationsModule` in `AppModule`. Migrating to CSS
  keyframes with `animation-delay: calc(var(--i) * 50ms)` removes the animations
  package from the bundle. Keep the header's narrowed selector behavior (see the comment in
  `header.component.ts:17-29`).

---

## P3: Refactoring and type safety

### 13. Everything config-related is typed `any`
- `SiteConfigService` exposes `data: any`, `menu: any[]`, `experiences: any`, and so on.
  Components pass `any` along (`FooterComponent.socials/email/footer`,
  `EducationComponent.experiences`, `ProjectsComponent.projects`,
  `WorkHistoryComponent.experienceList`, `HeaderComponent.navigate(menuItem: any)`).
  Templates are full of `?.` guards as a result.
- **Do:** add `src/app/services/site-config/site-config.model.ts` with interfaces
  (`MenuItem`, `Contact`, `Experience`, `ExperienceSection`, `Project`,
  `Banner`, `Footer`, `SiteConfig`) and type the service's fields. Then remove the
  unnecessary `?.` in templates. `strictTemplates` will point out real mistakes.
- Optional: add a JSON Schema for `config.json` and a unit test that validates it, since
  CLAUDE.md notes there's no schema validation today.
- `import * as siteConfig from '.../config.json'` gives a namespace object
  that also has `default`, and `resolveLogoKeys` walks the whole thing. Switch to a
  default import. Also, `resolveLogoKeys` **mutates the imported JSON in place**.
  Return new objects instead (a pure function) so tests and HMR don't see
  changed data.

### 14. Move fully to standalone components and signal APIs
- The app is a hybrid of NgModules (`AppModule`, `GeneralModule`, `HomeModule`) and
  standalone components. The standalone `ProjectsComponent` and `ProjectsHighschoolComponent` import
  **all of `HomeModule`** just to use `<app-workhistory>`. That puts the whole
  home module (banner, floating logos, typed.js, owl, and so on) into the reach of their
  lazy chunks. Check the chunk sizes in the build output.
- **Do:** run `ng generate @angular/core:standalone` (all three modes), then
  `bootstrapApplication` with `provideRouter`, `provideClientHydration`,
  `provideServiceWorker`, and `provideZonelessChangeDetection`. Remove `standalone: false`
  everywhere. After that, projects pages can import only `WorkHistoryComponent`.
- Signal migrations (`ng g @angular/core:signal-input-migration`,
  `output-migration`, `inject-migration`, `signal-queries-migration`):
  `@Input` → `input()`, `@Output` → `output()`, constructor DI → `inject()`,
  `@ViewChild(ren)` → `viewChild()` / `viewChildren()`.
- Replace `@HostListener` with the `host: {}` metadata where it remains.
- Replace the repeated `isBrowser` / `PLATFORM_ID` boilerplate (in about 10 classes) with
  `afterNextRender` / `afterRenderEffect` for DOM work where it fits. That's the idiomatic
  SSR-safe hook, and it removes most `if (!this.isBrowser) return;` guards.

### 15. `WorkHistoryComponent` template duplication
- `workhistory.component.html` repeats the carousel and static-image blocks
  for `i % 2 == 0` and `i % 2 != 0`, and uses `[ngClass]` for left/right alignment.
  Render one block and handle alternation with CSS (`:nth-child(even)` with
  `flex-direction: row-reverse` and text-align) or a single `[class.reverse]`
  binding. This roughly halves the template and removes `NgClass`.
- The inner `@for (...; let i = $index)` over `exp.description` shadows the outer
  `i`. Rename it.
- `track exp`, `track img`, and `track skill` track by object or string identity. That works,
  but `track $index` or a stable key is clearer. The same goes for `track menuItem` in the header.
- Replace the inline `style='width: auto;'` and `style='color: inherit'` with classes.

### 16. Header cleanups
- `responsiveMenuVisible: Boolean` should be `boolean`, and it should be a signal because it's
  toggled from template events (that's fine for OnPush). The `scroll()` path also sets it after
  an async `router.navigate().then(...)`, which OnPush won't pick up.
- `[ngStyle]="{'pointer-events': ...}"` → `[style.pointer-events]`.
- `this.pageYPosition` in templates → drop `this.`. (Banner does the same with `this.data`.)
- The desktop and mobile menus duplicate the `@for` and the analytics `(click)` on the
  `<li>` as well as the navigate `(click)` on the `<a>`. Fold analytics into `navigate()`.
- `setTimeout(() => this.setupSectionObserver())` after `NavigationEnd` → use
  `afterNextRender` so it runs after the new route renders, not after an arbitrary macrotask.

### 17. Small items
- `LoadingScreenComponent`: `setTimeout(playOutro, MIN_DISPLAY_MS)` isn't
  cleared in `ngOnDestroy`. `document.body.style.overflow` could get stuck on `hidden` if
  the component is destroyed first. Check `prefers-reduced-motion` (skip or shorten
  the intro).
- `FloatingLogosComponent`: when the banner scrolls off-screen, the rAF loop keeps running.
  Pause it with an `IntersectionObserver` on the host (it already pauses on
  `visibilitychange`). `ngOnDestroy` uses `typeof window` where the rest of the class
  uses `isBrowser`. Make them consistent. `generateLogos()` uses `Math.random()` during
  SSR, so server and client produce different logo sets. Check for a hydration
  mismatch warning in the console (`[src]`/`[style]` differences), and consider
  `@defer (on idle)` or `ngSkipHydration` for this purely decorative component.
- `LogoFallbackBackgroundDirective` / `LogoFallbackDirective`: both effects read
  `this.failed` and `this.fellBack`, which are not signals. They still work because the effect reads
  `accentColor()`, but making them signals reads more clearly.
- `AnalyticsService` event args are inconsistent: the header passes
  `(navTitle, "menu", "click")` (the action is a title), while the others pass `("click_x", category, label)`.
  Normalize them.
- `ResumeService.open()` uses `window` without a platform guard. It only runs from a
  click, so it's safe, but a one-line guard keeps it consistent.
- `scripts/*.js` use CommonJS. Fine, but `node:` prefixed imports would modernize them.

---

## Testing gaps
- There are 28 spec files. Check that they aren't just `should create` stubs. The places that most need tests are
  `SiteConfigService.resolveLogoKeys`, `buildFallbackLogoDataUri`/`wrapLines`,
  `LinkifyPipe` (XSS escaping), `iconForUrl`, the header scroll-spy
  `visibleSections` logic, and `ThemeService` cycle/storage/system-follow.
- After #2, add a Playwright check that GA's `gtag/js?id=G-` has a real ID on
  `/projects` and `/aardeyamz`.

## Suggested PR grouping
1. P0 #1–#4 (assets, GA injection, typo, `/home` nav).
2. #5 scroll performance plus `ScrollService`, and #16 header cleanups.
3. #6/#15 work-history carousel and template rewrite (possibly dropping owl).
4. #10/#11 dependency and bundle trim (with before/after bundle sizes in the PR).
5. #13 typed config.
6. #14 standalone/signals migration, then #12 animations migration.
7. #7, #8, #9, #17 in any order.
