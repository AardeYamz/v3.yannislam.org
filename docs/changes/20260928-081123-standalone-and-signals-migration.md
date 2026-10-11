Date: 2026-09-28 08:11:23

# Standalone Components and Signal APIs Migration

Migrates the app off NgModules and onto Angular's standalone/signal APIs,
addressing item #14 ("standalone + signals migration") from
`docs/todo/code-review-optimization.md`'s backlog.

## Bootstrap

Ran Angular's official `@angular/core:standalone` schematic in all three
modes (`convert-to-standalone`, `prune-ng-modules`, `standalone-bootstrap`),
then finished the bootstrap wiring by hand:

- `src/app/app.module.ts`, `app-routing.module.ts`, `app.module.server.ts`,
  `components/general/general.module.ts`, and
  `components/home/home.module.ts` are all deleted.
- `src/app/app.routes.ts` (new) holds the same 5 routes the deleted
  `app-routing.module.ts` declared.
- `src/app/app.config.ts` (new) is the client `ApplicationConfig`:
  `provideZonelessChangeDetection()`, `provideRouter()` (with scroll
  restoration), `provideAnimations()`, `provideClientHydration()`, and the
  service worker provider.
- `src/main.ts` now calls `bootstrapApplication(AppComponent, appConfig)`.
- `src/app/app.config.server.ts` (new) is a deliberately separate, minimal
  server `ApplicationConfig` — just `provideZonelessChangeDetection()`,
  `provideRouter()`, and `provideServerRendering()`. It does **not** merge
  the client config: the old `AppServerModule` never imported
  `BrowserAnimationsModule`, `ServiceWorkerModule`, or client hydration
  providers either, and merging them in here reproduced that same
  difference as a real bug — see "NG0401" below.
- `src/main.server.ts` now exports a bootstrap function that accepts and
  forwards Angular's `BootstrapContext`:
  ```ts
  const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(AppComponent, config, context);
  ```

### The NG0401 "Missing Platform" build failure

After the initial bootstrap rewrite, `npm run build` failed during route
extraction for prerendering with `NG0401`. The actual cause had nothing to
do with which providers the server config carried (that was the first,
wrong hypothesis, and rewriting `app.config.server.ts` to a minimal set
alone didn't fix it): `bootstrapApplication()` takes an optional third
`BootstrapContext` argument, and the server bootstrap function wasn't
accepting or forwarding it. `@angular/core`'s own error text (`throw new
RuntimeError(-401, 'Missing Platform: ... make sure bootstrapApplication is
called with a context argument.')`) named the real problem once found.
Passing `context` through in `main.server.ts` (shown above) fixed the build
completely — all 5 routes prerender correctly with real content and the
`ng-server-context` hydration marker intact.

## Signal APIs

Ran the remaining official migration schematics in this order:
`inject-migration`, `signal-input-migration`, `signal-queries-migration`,
`output-migration`.

- Constructor-parameter DI became field-level `inject()` calls throughout.
- `@ViewChild`/`@ContentChild` became `viewChild()`/`contentChild()`
  signal queries (3/3 migrated automatically).
- `@Output() x = new EventEmitter()` became `x = output()` (1/1 migrated
  automatically).
- `@Input()` became `input()` for 4 of 9 inputs automatically.
  `WorkHistoryComponent`'s remaining 5 inputs
  (`experienceList`/`sectionId`/`navNumber`/`headingText`/`subsection`)
  were skipped by the schematic because its spec wrote to them directly
  (`component.experienceList = list`), which isn't legal on a signal input.
  Converted those by hand, updated the template to call each input as a
  function, and rewrote the spec to use
  `fixture.componentRef.setInput(...)` instead of direct assignment.

Four other specs directly instantiated their component with `new
Component(a, b, c)`, matching the old constructor-parameter DI signature.
Once DI moved into the constructor body via `inject()`, that stopped
compiling (`inject()` requires an active injection context, which a bare
`new` doesn't have). Fixed by wrapping construction in
`TestBed.runInInjectionContext()` with the same fakes now registered as
`TestBed` providers instead of passed positionally:
`header.component.spec.ts`, `projects.component.spec.ts`,
`projects-highschool.component.spec.ts`, `linkify.pipe.spec.ts`.

## `@HostListener` → `host` metadata

Converted every remaining `@HostListener()` decorator (10 listeners across
5 files: both `link-preview` directives, `LogoFallbackDirective`,
`HeaderComponent`, `FooterComponent`) to the equivalent `host: {
'(event)': 'handler()' }` binding in `@Component`/`@Directive` metadata,
per the backlog's explicit ask. Behavior is unchanged — same event names,
same handler methods, same `['$event']` argument passing.

## What was deliberately left out

- **Animations migration** (`@angular/animations` → CSS, backlog item #12)
  was scoped out of this PR entirely. `fadeStaggerAnimation` (used by
  `HeaderComponent` and `FooterComponent`) is intentionally excluded from
  the standalone/signals work: rewriting it is a separate, self-contained
  change with its own visual-regression risk, better verified on its own
  rather than bundled with a bootstrap rewrite that already touches every
  component in the app.
- **`isPlatformBrowser`/`PLATFORM_ID` → `afterNextRender`/`afterRenderEffect`**
  (also named in the backlog) was evaluated but not applied. 9 files use
  the pattern; most of them (`AosDirective`, `LinkPreviewService`,
  `LogoFallbackBackgroundDirective`, `FloatingLogosComponent`, `ThemeService`,
  `BannerComponent`) are unrelated to `AppComponent`/`LoadingScreenComponent`'s
  hydration contract but still carry real prerendering behavior that a
  blanket rewrite risks breaking the same way the NG0401 bug above did.
  Left as a follow-up rather than risking a second render-timing bug in an
  already-large PR.
- `AppComponent` and `LoadingScreenComponent`'s hydration-detection logic
  (`isPlatformBrowser()`/`wasServerPrerendered()` guards evaluated
  synchronously in the constructor, gating `headerReady`) is preserved
  byte-for-byte in control flow — only the DI mechanism producing
  `platformId` changed (constructor parameter → field `inject()`), per
  `CLAUDE.md`'s explicit warning that this code's SSR/hydration contract is
  fragile.

## Verification

- `npm test` — 150/150 passing.
- `npm run build` — clean, all 5 routes prerendered
  (`/`, `/projects`, `/projects/highschool`, `/aardeyamz`, plus the SSR
  `index.server.html`) with real content and the `ng-server-context`
  hydration marker present.
