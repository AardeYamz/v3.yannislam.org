Date: 2026-09-25 08:13:01

# Dependency and bundle trim

Fourth PR out of `docs/todo/code-review-optimization.md`'s suggested
grouping: "#10/#11 dependency and bundle trim (with before/after bundle
sizes in the PR)."

## #11 — Font Awesome replaced with inline SVG

`docs/changes/20260731-184800-css-bundle-trim.md` already trimmed Font
Awesome from `all.css` down to `fontawesome.css` + `solid.css` +
`brands.css` (the minimum FA7's shared-glyph-table structure allows without
per-icon surgery). What was left after that trim — the shared core plus two
webfont files — is what this PR removes entirely, for the same 12 glyphs
the site actually uses.

**New `src/app/icons/`:**

- `icon-registry.ts` — a `Record<string, IconDef>` of `viewBox`/`path` pairs,
  copied verbatim from
  `node_modules/@fortawesome/fontawesome-free/svgs/{solid,brands}/*.svg`
  (Font Awesome Free 7.3.1, CC BY 4.0). Verified byte-for-byte against the
  source files with a throwaway script (diffed every `path`/`viewBox`
  string) rather than trusting manual transcription. Keyed by the same
  `fa-xxx` strings already used throughout the app (`config.json`'s `icon`
  fields, `ICON_BY_DOMAIN` in `link-preview-card.ts`), so nothing that
  already stored an icon name needed to change format — only the "fab "/"fas
  " *style*-prefix concatenation some call sites did went away, since an
  inline SVG doesn't need to know which icon family it came from.
- `icon.component.ts` — a small standalone `<app-icon [name]="...">`
  component. `safeSvg` is a `signal<SafeHtml>`, not a plain field: writing
  a plain field from an `@Input()` setter only reliably marks an OnPush
  view dirty when Angular's own compiled template-binding instruction is
  what triggered the write (the normal case for a real `[name]="..."`
  binding) — a direct test mutation of `.name` doesn't go through that
  path, and neither would some hypothetical future caller that sets it
  imperatively. A signal write marks the view dirty either way. (Caught
  this the hard way: the first version used a plain field + host
  `[innerHTML]` binding, and a "does the glyph actually change" test
  failed — the DOM never updated on the second `.name` assignment even
  though the field itself held the new value. Switching to a signal fixed
  it and is the more robust design regardless.)

**Every consumer updated:**

- `header.component.html` — theme-toggle and hamburger `<i class="fa-solid" [class.fa-x]="...">` → `<app-icon [name]="...">` with the icon name chosen by the same ternary the class bindings used to express.
- `footer.component.html`/`.ts` — all three icon lists (desktop side bar, mobile, bottom-bar-on-scroll) → `<app-icon [name]="social.icon">`. Deleted `socialIconClass()` entirely: its only job was picking `'fas '` vs `'fab '` by name, which an SVG lookup never needed in the first place.
- `workhistory.component.html` — the two link icons → `<app-icon name="fa-up-right-from-square">` / `name="fa-external-link-alt"`.
- `link-preview-card.ts` — `ICON_BY_DOMAIN`/`DEFAULT_ICON` values lost their style prefix (`'fab fa-linkedin-in'` → `'fa-linkedin-in'`).
- `link-preview.service.ts` — this one builds its card with plain `document.createElement()` calls (not Angular bindings), so it doesn't use `<app-icon>`; `this.iconEl.className = data.icon` (set a CSS class) became `this.iconEl.innerHTML = svgMarkup(data.icon)` (inject the SVG directly). `data.icon` is always one of this app's own registry keys, never external input, so this is the same trusted-constant-HTML case `DomSanitizer.bypassSecurityTrustHtml` exists for — done directly here since there's no Angular binding involved. `link-preview.scss` (global, unscoped) gained one rule sizing the injected `<svg>` to `1em`.
- `GeneralModule`/`HomeModule` — both import the new standalone `IconComponent` alongside their existing declarations.
- `angular.json`, `package.json` — the three `fontawesome-free` CSS files dropped from `styles`; the package dropped from `dependencies` entirely (nothing references it anymore — confirmed with a repo-wide grep for `fa-solid`/`class="fa`/`fab `/`fas ` after the change, clean).

Every `i { font-size: ...; color: ...; }`-style CSS selector that targeted
the old `<i>` tags directly (`footer.component.scss` ×3,
`workhistory.component.scss` ×1) was updated to target `app-icon` instead
— same rules, same specificity, just a different tag name, since `<app-icon>`
renders as an actual custom element and CSS type selectors match it exactly
like any other tag.

### Before / after (production build)

| | Before (`main`) | After | Change |
| --- | --- | --- | --- |
| `styles.css` | 213,548 B | 122,735 B | **−90,813 B (−42.5%)** |
| `fa-solid-900.woff2` | 119,488 B | *(removed)* | −119,488 B |
| `fa-brands-400.woff2` | 115,420 B | *(removed)* | −115,420 B |
| **Total** | | | **≈ −325.7 KB** |

Close to `desktop-performance.md`'s "~350 KB" estimate for this exact
change. The two webfont files were `assetGroup`-cached (lazy, not
render-blocking), so this isn't 325 KB off the critical path specifically —
but it's 325 KB fewer bytes in the deploy and download graph either way,
and `styles.css` *is* render-blocking.

### Verified in a browser

Built the production bundle, served it locally
(`npx http-server dist/v3.yannislam.org/browser`), and screenshotted every
icon: the header theme toggle through all three theme modes (circle-half-
stroke/sun/moon all render and swap correctly), the mobile hamburger
(bars ↔ xmark), the footer's desktop side bar (all 6: email, LinkedIn,
GitHub, TikTok, Facebook, Instagram), the mobile footer row, and the
workhistory external-link icon. No console errors. `npm test` (156/156,
including 10 new tests for the icon registry/component) and `npm run
build` both pass.

## #10 — unused imports and modules

- `GeneralModule` imported `FormsModule`/`ReactiveFormsModule` only for
  `HeaderComponent.languageFormControl`, which was declared but never
  referenced in the template. Removed the field, the `FormControl` import,
  and both module imports. **Left `@angular/forms` in `package.json`** —
  `@ng-bootstrap/ng-bootstrap`'s own `peerDependencies` require it
  (confirmed by reading its `package.json`), so removing the package
  itself would leave an unmet peer dependency even though this app's own
  code no longer imports it directly.
- `GeneralModule` also imported `NgbNavModule`, unused there (only
  `education.component.html`, wired through `HomeModule`'s own separate
  `NgbNavModule` import, actually uses `ngbNav`). Removed.
- `NamecardComponent` injected `Router` and never used it. Removed the
  constructor parameter and import.
- `AnalyticsService.sendAnalyticPageView()` had no callers anywhere in the
  app — `gtag('config', ...)` in `index.html` is GA4's base setup call, and
  GA4's enhanced-measurement "page changes based on browser history
  events" toggle (on by default for GA4 properties) already covers SPA
  route-change page views without any app code. **Deleted** rather than
  wiring it up to `NavigationEnd`: doing that without confirming the GA4
  admin setting (not checkable from here) risked double-counting page
  views if enhanced measurement is already on, which is the more likely
  default state and a worse outcome than the status quo. Updated
  `CLAUDE.md`'s `AnalyticsService` line, which previously (incorrectly)
  claimed this service handled page views.
- `WorkHistoryComponent` also injected `AnalyticsService` and never used
  it (spotted while working on PR #110's carousel rewrite, deferred to
  this PR per that PR's write-up). Removed.
- `@angular/localize` — referenced in `tsconfig.app.json`'s `types` and via
  a triple-slash reference in `main.ts`, but `$localize` is never called
  anywhere in `src/`. Removed both references; `npm run build` still
  succeeds, confirming ng-bootstrap's compiled `.d.ts` files don't actually
  need the ambient `$localize` global for type-checking despite listing
  `@angular/localize` as a peer dependency. Left the package itself
  installed (devDependency) for the same peer-dependency reason as
  `@angular/forms` above.
- `src/server.ts` (the Express/`AngularNodeAppEngine` scaffold) — **not
  touched.** `docs/changes/20260811-013939-ssr-prerendering.md` already
  flags this as "not needed for deployment" but explicitly warns that
  switching `outputMode: "server"` → `"static"` "should be checked against
  an actual deploy, not assumed" (Vercel's zero-config framework detection
  behavior with `@angular/ssr`/`server.ts` present is unverified from a
  sandbox with no deploy access). Left as a flagged, deliberately deferred
  decision rather than guessed at.

## Test plan

- `npm test` — 156/156 (150 existing + a handful removed for deleted
  code + 10 new: `icon-registry.spec.ts`, `icon.component.spec.ts`).
- `npm run build` succeeds; `npm ci` verified clean against the
  regenerated lockfile (`@fortawesome/fontawesome-free` removed).
- Manually verified every icon in a real browser (see above) — this is a
  visually load-bearing change touching six files, so build success alone
  wasn't enough.
