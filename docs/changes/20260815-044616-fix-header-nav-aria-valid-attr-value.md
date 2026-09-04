Date: 2026-08-15 04:46:16

# Header desktop nav: fix invalid `aria-controls` reference (aria-valid-attr-value)

## Context

Reported via Vercel Toolbar's accessibility panel, which links to
[axe's `aria-valid-attr-value` rule](https://dequeuniversity.com/rules/axe/4.9/aria-valid-attr-value).
`lighthouserc.js` already tracked this exact audit as a known-failing
`warn` (see its "Known-failing today" comment block), but the comment
predates this investigation and nobody had traced it to a specific
element yet.

The Lighthouse CI job in `build-test.yml` only crawls the four routes in
`lighthouserc.js`'s `paths` array on a cold page load, so I also ran
`axe-core` directly with Playwright against the built site — including
after opening the mobile menu, toggling the theme, and opening an
AardeYamz tile — to rule out a state-dependent bug that a single-pass
crawl would miss. It didn't turn out to be state-dependent: the same
element failed on every route, every time, because it's part of the
site-wide header.

### Root cause

`header.component.html`'s **desktop** nav list used `ngbNav` /
`[ngbNavItem]` / `ngbNavLink` from ng-bootstrap:

```html
<ul ngbNav #nav="ngbNav" class="menu-ul">
  @for (menuItem of menu ; track menuItem; let i = $index) {
    <li [ngbNavItem]="i" ngbNavItem (click)='...'>
      <a ngbNavLink (click)='navigate(menuItem)' [class.nav-link-active]="...">
        ...
      </a>
      <ng-template ngbNavContent>{{menuItem?.navContent}}</ng-template>
    </li>
  }
</ul>
```

`ngbNav` is ng-bootstrap's tabs/tabpanel widget — a `<a ngbNavLink>` is
meant to control a corresponding panel rendered by a
`<div [ngbNavOutlet]="nav">` elsewhere in the template. This usage had
none of that:

- No `[ngbNavOutlet]` anywhere in `header.component.html`, so the
  `<ng-template ngbNavContent>` blocks were dead code — never rendered,
  for any menu item, ever.
- No `[(activeId)]` binding either, so `ngbNav`'s own notion of "which
  item is active" was never set by this component — it silently
  defaulted to the first item.

None of that stopped `ngbNavLink` from emitting full tab semantics
anyway. Its host bindings (in
`node_modules/@ng-bootstrap/ng-bootstrap/.../nav.mjs`) are:

```js
'attr.role': "role ? role : nav.roles ? 'tab' : undefined",
'attr.aria-controls': 'navItem.isPanelInDom() ? navItem.panelDomId : null',
'attr.aria-selected': 'navItem.active',
```

and `isPanelInDom()` is:

```js
isPanelInDom() {
  return (isDefined(this.destroyOnHide) ? !this.destroyOnHide : !this._nav.destroyOnHide) || this.active;
}
```

Despite the name, this method has no idea whether an outlet was ever
declared in the template — it just assumes one exists whenever
`destroyOnHide` isn't explicitly turned on (the default), or whenever
the item happens to be `active`. Since our header never set
`[(activeId)]`, the first menu item (`i === 0`) was always `active`
by ngbNav's default, so its link always rendered:

```html
<a id="ngb-nav-0" role="tab" aria-selected="true" aria-disabled="false"
   aria-controls="ngb-nav-0-panel">
```

`#ngb-nav-0-panel` never existed anywhere in the DOM — axe's
`aria-valid-attr-value` rule checks that ID-reference ARIA attributes
(`aria-controls`, `aria-describedby`, `aria-labelledby`, etc.) resolve
to a real element, and this one never did. It's also independently
wrong on a second axis: this "active tab" tracked nothing about actual
page state (the real active-section highlighting is a separate,
correct mechanism — `activeSection()` / `[class.nav-link-active]`, fed
by an `IntersectionObserver` in `header.component.ts`) — so a screen
reader would announce "Home, tab, selected" regardless of which
section the user had actually scrolled to.

The mobile drawer nav a few lines down in the same template
(`.menu-responsive` → `<aside id="mobile-menu">` → `<ol><li><a>`)
implements the identical menu with a plain link list and no `ngbNav` —
that version was already correct, and is what this fix aligns the
desktop version with.

## Fix

Dropped `ngbNav` / `[ngbNavItem]` / `ngbNavLink` / `ngbNavContent`
from the desktop nav entirely and replaced it with the same plain
list pattern the mobile drawer already uses — real navigation with no
panel to control, so no tab/tabpanel ARIA role applies:

```html
<ul class="menu-ul nav">
  @for (menuItem of menu ; track menuItem; let i = $index) {
    <li class="nav-item" (click)='analyticsService.sendAnalyticEvent(menuItem?.navTitle, "menu", "click")'>
      <a class="nav-link" (click)='navigate(menuItem)'
        [class.nav-link-active]="!!menuItem?.scrollSection && activeSection() === menuItem.scrollSection">
        @if (menuItem?.navNumber) {
          <span class='nav-number'>{{menuItem?.navNumber}}</span>
        }
        <span class="nav-text">{{menuItem?.navTitle}}</span>
      </a>
    </li>
  }
</ul>
```

`ngbNav`/`ngbNavItem`/`ngbNavLink` each implicitly added a Bootstrap
class via a host binding — `classAttribute: "nav"`, `"nav-item"`, and
`"nav-link"` respectively (same `nav.mjs` source as above). All three
are added back explicitly here since removing the directives would
otherwise remove the CSS classes along with them, not just the ARIA
attributes. This isn't just cosmetic: `header.component.scss` has

```scss
@media (max-width: 1050px) {
    nav .nav {
        display: none;
    }
    ...
}
```

which hides the desktop nav below the hamburger breakpoint by
targeting Bootstrap's `.nav` class specifically — not `.menu-ul`. A
first pass at this fix dropped `ngbNav` without restoring `.nav`, which
silently broke two things at once, caught by this PR's own CI run
(`e2e (1)` and `e2e (2)` both failed — see "CI caught a regression"
below) rather than by hand: the nav lost the `.nav` class's flex
layout (Bootstrap's base rule, since `.menu-ul`'s own rule only adds
`align-items: center` on top of it, not a full layout) and, on mobile,
stayed visible instead of yielding to the hamburger drawer, since `nav
.nav` no longer matched anything. `[class.nav-link-active]` (the
component's own, correct active-state mechanism) is untouched
throughout. `NgbNavModule` stays imported — `education.component.html`
still uses `ngbNav` correctly there, with both `[ngbNavOutlet]="nav"`
and `[(activeId)]="active"` present, so its `aria-controls` genuinely
resolves to a rendered panel.

### CI caught a regression

The first commit on this PR (`ngbNav` removed, ARIA fixed, but without
restoring `.nav`/`.nav-item`) passed every local check available at the
time — build, `tsc`, the axe scan, even a from-scratch `lhci autorun` —
because none of those exercise cross-viewport layout or full-page click
interactions. `build-test.yml`'s `e2e` jobs did, and both failed:

- `e2e/responsive.spec.ts:23` — `.nav-right ul.menu-ul` expected
  `toBeHidden()` at mobile width, found visible. Direct fallout of `nav
  .nav` no longer matching.
- `e2e/navigation.spec.ts:59` — clicking "← Back to Projects" timed
  out: `<div class="container"> from <app-header> subtree intercepts
  pointer events`. The desktop `.container`, no longer flex-laid-out by
  `.nav`, grew and started overlapping page content below the header,
  eating clicks meant for the page.

Both traced to the same missing classes and were fixed by the class
restoration above, then re-verified — see Verification below.

## Verification

Couldn't run `ng build`/`ng test` in earlier sessions in this sandbox —
the container's system Node (v22.22.2) sits just below the Angular CLI's
hardcoded minimum (v22.22.3+). Installed Node 22.22.3 via `nvm` for this
session specifically to get a real build and run the actual tools
end-to-end, rather than reasoning about the fix without executing it.

- `npx ng build --configuration production` — succeeds (only the
  pre-existing, unrelated `header.component.scss` byte-budget warning).
- Ran `axe-core` (bundled with `lighthouse`, currently 4.13.0) directly
  via Playwright + the pre-installed Chromium against the built site,
  filtered to `aria-valid-attr-value`/`aria-valid-attr`, across 7
  scenarios: cold load on all 4 routes (`/`, `/projects/`,
  `/projects/highschool/`, `/aardeyamz/`), plus the mobile menu opened,
  the theme cycled to dark, and an AardeYamz tile opened.
  - **Before the fix**: `aria-controls="ngb-nav-0-panel"` flagged on
    every route (the header is site-wide, so it reproduced everywhere,
    not just on `/`).
  - **After the fix**: zero violations across all 7 scenarios.
- Ran an unrestricted `axe.run()` (all rules, not just the two above)
  against all 4 routes post-fix to confirm the change didn't introduce
  anything new elsewhere. Only the three pre-existing, already-tracked
  issues remain (`color-contrast`, `heading-order`, `link-name` — all
  still `warn` in `lighthouserc.js`, out of scope for this fix, and
  present before this change too).
- Ran the actual `npx lhci autorun --config=./lighthouserc.js` (the
  same command `build-test.yml`'s `lighthouse` job runs), 3 runs ×
  4 routes = 12 total: exit code 0, and `aria-valid-attr-value` doesn't
  appear anywhere in the assertion output — a passing audit produces no
  output for that check, whether it's `warn` or `error`.
- Promoted `'aria-valid-attr-value': 'warn'` to `'error'` in
  `lighthouserc.js`, per that file's own "Flip to 'error' as each is
  fixed" convention — this both documents the fix and gates against a
  regression. Re-ran `lhci autorun` after the promotion: still exit
  code 0, confirming the assertion actually passes at the stricter
  level rather than just not being checked.
- After CI caught the layout regression (above) and it was fixed by
  restoring the `.nav`/`.nav-item` classes, re-verified all of the
  above still holds — the axe scan (7 scenarios, 0 violations) and
  `lhci autorun` (exit 0) were both re-run against the corrected
  build, not just the first pass.
- Ran the actual e2e suite the failing CI jobs ran
  (`e2e/navigation.spec.ts` + `e2e/responsive.spec.ts`, chromium +
  mobile projects, against the corrected build via `http-server` —
  same as CI's `webServer` config): 25 passed, 0 failed, where the
  same run had 2 real failures (not flakes) against the first-pass fix.
  (This sandbox has no network path to `cdn.playwright.dev` for the
  pinned browser revision, so `playwright.config.ts` was pointed at
  the pre-installed Chromium via `launchOptions.executablePath` for
  this run only, then reverted — not part of the committed diff.)
- Screenshotted the header at 1280px and 390px widths against the
  corrected build to confirm the restored classes produce the same
  layout as before this PR: desktop shows the horizontal nav row
  (numbered items + theme toggle), mobile shows just the theme toggle
  and hamburger with the desktop links hidden.

## Files touched

- `src/app/components/general/header/header.component.html` — desktop
  nav: `ngbNav`/`ngbNavItem`/`ngbNavLink`/`ngbNavContent` removed
  (drops the invalid ARIA), `nav`/`nav-item`/`nav-link` Bootstrap
  classes added back explicitly (keeps the existing layout/CSS
  working) — replaced with the plain link-list pattern already used by
  the mobile drawer nav in the same file.
- `lighthouserc.js` — `aria-valid-attr-value` promoted from `warn` to
  `error`, with a comment explaining the fix and pointing here.
