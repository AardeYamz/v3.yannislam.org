# PR #16 (Material Design 3 tokens) — measured review

[PR #16 — "Adopt Material Design 3 tokens + header/layout
fixes"](https://github.com/AardeYamz/v3.yannislam.org/pull/16), reviewed at
head `6aa4cd4` against base `main` `1587174`.

**Verdict: the header interaction fixes and the container/layout fixes are
real and hold up under measurement. It ships one functional bug (the new
scroll-spy), one visual regression (the button outline), and leaves
`header.component.scss` 41 bytes from failing the production build.** None
of the three is large; all three are worth fixing before merge.

---

## What was verified

Both branches built with `ng build` and served from a local static file
server, then driven in headless Chromium. Everything below is measured, not
read off the diff.

### The PR's own claims that check out

- [x] **Header entrance no longer strands the menu toggle.** Scoping
      `fadeStaggerAnimation` to `.container > *` does what the description
      says.
- [x] **Corner hit-testing on the icon buttons.** `elementFromPoint` at the
      center and at both diagonal corners of `.theme-toggle` and
      `.menu-toggle` (46×46) resolves to the button itself, drawer open or
      closed. The state-layer-owns-the-radius trick works.
- [x] **The drawer opens and closes from the header.** `.menu-toggle`
      toggles `aside-show` both directions; the X is not swallowed by the
      overlay.
- [x] **The theme toggle stays live while the drawer is open.** This is the
      last commit on the branch and it is effective.
- [x] **The double-shrinking `.container` fix is real.** At a 1440px
      viewport, `main` renders section containers at 1140/1145px (and a
      1296px `body.container`); PR #16 renders a uniform **1220px** with the
      `body` wrapper gone.
- [x] **No fixed-footer-bar overlap.** Swept 768 → 2560px: the
      `.footer-left-bar` right edge stays clear of the container's left edge
      at every width.
- [x] **The logo stays square.** Checked at 390/900/1440/1700/2400px, at
      rest and scrolled — no aspect distortion from the new
      `.navbar-brand` sizing.

### Bundle impact

| Artifact | `main` | PR #16 | Change |
| -------- | ------ | ------ | ------ |
| `styles-*.css` | 207,291 B | 211,931 B | +4.6 KB |
| `main-*.js` | 146,642 B | 151,767 B | +5.1 KB |

Modest, and in line with what the token layer and scroll-spy add.

---

## 1. The scroll-spy is unreliable during normal scrolling

`setupSectionObserver()` in `header.component.ts` is the only new *behavior*
in this PR, and it only works for jump navigation.

Clicking each nav link, and calling `scrollIntoView` on each section id,
highlights the correct item all four times. Scrolling continuously does not.
Sweeping the page in 200px steps at 1440×900:

```
y= 3200 -> 01. About        (band is inside #workhistory)
y= 4000 -> 02. Education    (band is ~1800px past #education)
y= 4800 -> 01. About        (goes backwards)
y= 8800 -> 03. Experience   (band is fully inside #volunteering)
```

**"04. Volunteering" never highlights on the way down**, and scrolling back
to the hero leaves "01. About" stuck lit.

Section geometry at that viewport, for reference:

```
about        top=900   h=765
education    top=1665  h=599
workhistory  top=2264  h=5950
volunteering top=8214  h=3294
IO band = scrollY+110 .. scrollY+405   (rootMargin -110px 0 -55% 0)
```

Two causes, both in the observer callback:

- `if (!visible.length) return;` — when a section *leaves* the band the
  callback fires carrying only a non-intersecting entry, so it bails and
  keeps the stale highlight. That is the stuck-at-top case.
- `entries` contains only the sections whose state *changed*, but `topmost`
  is reduced over that batch as if it were the full set of currently visible
  sections. `workhistory` (5950px) and `volunteering` (3294px) are both far
  taller than the 295px band, so `volunteering` enters while `workhistory`
  is still intersecting; `workhistory` wins on `boundingClientRect.top`;
  then `workhistory`'s exit fires *alone* and hits the early return.
  Volunteering is unreachable.

Track state across callbacks rather than per-batch:

```ts
private visibleSections = new Set<string>();

// in setupSectionObserver(), before constructing the observer:
this.visibleSections.clear();

// in the callback:
entries.forEach((e) => e.isIntersecting
  ? this.visibleSections.add(e.target.id)
  : this.visibleSections.delete(e.target.id));

const ordered = sections.filter((s) => this.visibleSections.has(s.id));
this.activeSection.set(ordered.length ? ordered[0].id : '');
```

`sections` is already in document order, so `ordered[0]` is the topmost
visible section, and the empty case now clears the highlight instead of
freezing it.

Separately: `rootMargin: '-110px …'` is hardcoded, while this same PR scales
the nav bar to 120px at ≥1600px and 140px at ≥2200px. The band is
misaligned on exactly the large viewports the PR adds.

---

## 2. `.main-btn` loses its visible outline

`border: 1px solid $Orange` became `border: 1px solid $Outline`.
`--md-sys-color-outline` aliases `--color-lightest-navy`, which is a
near-background tone in every mode:

| Mode | Border vs page background | |
| ---- | ------------------------- | - |
| light — `main` | `#d9720c` on `#f4f1ea` | **2.93:1** |
| light — PR #16 | `#e4ded2` on `#f4f1ea` | **1.19:1** |
| default/dark — PR #16 | `#303c55` on `#131f31` | ~1.9:1 |

At 1.19:1 the "Email Me!" / "Resume" buttons read as floating text until
hovered — the affordance is gone, not merely subtle. WCAG's non-text
contrast minimum is 3:1, which the original 2.93:1 already just missed and
this makes considerably worse.

MD3's outlined button pairs the `outline` role with a *surface-container*
fill, not a bare page background. Using `$Primary` for the border keeps both
the pill shape and the new state layer while restoring the affordance:

```scss
.main-btn {
    border: 1px solid $Primary;
}
```

---

## 3. `header.component.scss` is 41 bytes from failing the build

`main` produces **no** budget warnings. PR #16 adds two:

```
WARNING  header.component.scss ...... 983 bytes over ... total of 5.98 kB
WARNING  workhistory.component.scss .. 295 bytes over ... total of 5.29 kB
```

`anyComponentStyle` in `angular.json` is `maximumWarning: 5kb` /
`maximumError: 6kb`. Angular counts a kB as 1024 bytes, so the header
stylesheet sits at 6103 of 6144 bytes. Appending a single 78-byte rule turns
the warning into a hard failure:

```
ERROR  header.component.scss exceeded maximum budget.
       Budget 6.00 kB was not met by 52 bytes with a total of 6.05 kB.
```

This is already distorting the code. It is why the ≥1600px nav-bar rules
live in `styles.scss` behind `!important` instead of in the component — the
comment there says so outright ("header.component.scss itself is already
right at this project's per-component style budget"). Leaving it here means
the next one-line CSS change breaks CI for a reason unrelated to that
change.

Either raise `maximumError` deliberately, or lift the mobile-drawer block
out of `header.component.scss` into its own component so both stylesheets
sit comfortably inside the budget.

---

## 4. Dead term in the `.container` rule

```scss
@media (min-width: 768px) {
    .container { max-width: min(94vw, 1800px, calc(100vw - 220px)) !important; }
}
```

`94vw` is never the binding constraint. Below ~2020px, `100vw - 220px` is
always smaller; above it, the 1800px cap takes over. Measured across
768 → 2560px, the binding term is only ever `100vw-220` or `1800px`:

```
 width | container | 94vw | 100vw-220 | binding
   768 |       548 |  722 |       548 | 100vw-220
  1440 |      1220 | 1354 |      1220 | 100vw-220
  1920 |      1700 | 1805 |      1700 | 100vw-220
  2100 |      1800 | 1974 |      1880 | 1800px
  2560 |      1800 | 2406 |      2340 | 1800px
```

The accompanying comment has the reasoning inverted — it claims the flat
110px reservation is only needed "below the ~2040px width where the 94vw
margin naturally clears that on its own", but 94vw never clears it first at
any width. Harmless to render, but the term and its comment are misleading
to the next reader. Drop `94vw` and correct the comment.

---

## Also worth noting

- **`src/styles.scss:284` and `:296` are the same 12-line comment block,
  duplicated verbatim.**
- **`.nav-shadow .navbar-brand img { width: 42px }` does not apply below
  1050px.** The component's `@media (max-width: 1050px) { .navbar-brand img
  { width: 100% } }` outranks it, so mobile keeps a 46px logo when scrolled.
  It still fits — 3.5px of clearance at the 45° worst case, against the
  6.3px the rule intends — so this is intent-not-applied rather than
  breakage.
- **The ≥1600px `!important` height overrides also match the drawer.**
  `.on-top` and `.nav-shadow` both get `height: … !important`, and the
  mobile drawer `<aside>` carries *both* classes. This is currently harmless
  only because `.menu-responsive` is `display: none` above 1050px — the
  drawer's `height: 100%` is one media-query edit away from being clobbered.
- **The `setTimeout` in the `NavigationEnd` subscription is not cancelled in
  `ngOnDestroy`.** No practical impact, since `HeaderComponent` lives for the
  application's lifetime.
- **Light/dark token wiring resolves correctly.** `on-primary` /
  `on-secondary` flip as intended in `[data-theme="light"]`, and the
  `color-mix()` tiers resolve against the active mode's palette. No issues
  found in the token layer itself.

---

## Required before merge

- [ ] **Fix the scroll-spy** to accumulate intersection state across
      callbacks and to clear `activeSection` when nothing is visible (§1).
      Without this, Volunteering never highlights and the indicator lies
      during ordinary scrolling.
- [ ] **Restore a visible `.main-btn` border** — `$Primary` rather than
      `$Outline` (§2).
- [ ] **Deal with the style budget** before it fails on someone else's
      unrelated change: raise `maximumError`, or split the drawer out of
      `header.component.scss` (§3).

## Nice to have

- [ ] Derive the scroll-spy `rootMargin` from the actual nav height instead
      of a hardcoded `-110px`, so it tracks the 120px/140px large-viewport
      nav bars this PR introduces.
- [ ] Drop the dead `94vw` term and fix its comment (§4).
- [ ] Delete the duplicated comment block in `styles.scss`.

---

## How to reproduce

```bash
# Angular CLI 22 needs Node >= 22.22.3
git worktree add /tmp/pr16 origin/claude/material-design-3-update-f000uo
git worktree add /tmp/mainbase origin/main
(cd /tmp/pr16 && npm ci && npx ng build)       # note the two budget warnings
(cd /tmp/mainbase && npm ci && npx ng build)   # note the absence of any

# serve each dist/v3.yannislam.org/browser, then in Chromium:
#  - scroll in 200px steps and log which .menu-ul a has .nav-link-active
#  - read getComputedStyle('.main-btn').borderTopColor against body background
#  - measure section .container widths across a 768..2560px viewport sweep
#  - elementFromPoint at the corners of .theme-toggle / .menu-toggle,
#    with the drawer both open and closed

# budget headroom check:
printf '\n.probe { color: red; background: blue; border: 1px solid green; }\n' \
  >> /tmp/pr16/src/app/components/general/header/header.component.scss
(cd /tmp/pr16 && npx ng build)                 # now ERRORs by 52 bytes
```
