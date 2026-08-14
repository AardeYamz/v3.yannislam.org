Date: 2026-08-10 21:11:25

# Mobile hamburger menu: accessibility fix

## Context

`header.component.html`'s mobile menu toggle (visible below the 1050px
breakpoint, see `docs/changes/20260728-151017-logo-svg-dark-mode.md`'s "Breakpoint
widening" section) was a plain `<div>` with a click handler:

```html
<div [class.animate]='responsiveMenuVisible' (click)='responsiveMenuVisible = !responsiveMenuVisible'
class="hamburger-menu"></div>
```

Compared to the theme-toggle `<button>` right next to it in the same
template, this had four real defects:

- Not a `<button>` (or any element with an interactive role), so screen
  readers had no way to announce it as a control.
- No `tabindex`, so it wasn't reachable via keyboard `Tab` at all — the
  mobile drawer had no keyboard path to open it.
- No keyboard handler, so even if it were focusable, Enter/Space (the
  activation keys a native button gets for free) wouldn't have triggered
  the click.
- No `aria-expanded`/`aria-label`/`aria-controls`, so assistive tech had no
  label for what the control does or whether the drawer it opens is
  currently expanded.

## Fix

Converted the `<div>` to a real `<button type="button">`, matching the
theme-toggle's pattern, rather than bolting `role="button"` +
`tabindex="0"` + a manual keydown handler onto a `<div>` — a native
`<button>` gets keyboard focus and Enter/Space activation from the browser
for free, and the existing `.hamburger-menu` CSS (the animated bars: the
button's own background as the middle bar, `::before`/`::after` as the
top/bottom bars) applies cleanly to a `<button>` with no restructuring:

```html
<button type="button" [class.animate]='responsiveMenuVisible' (click)='responsiveMenuVisible = !responsiveMenuVisible'
class="hamburger-menu" [attr.aria-expanded]="responsiveMenuVisible" aria-label="Toggle menu"
aria-controls="mobile-menu"></button>
```

- `[attr.aria-expanded]="responsiveMenuVisible"` — mirrors the component's
  existing open/closed boolean, so it always matches the drawer's actual
  state.
- `aria-label="Toggle menu"` — a static label, in the same tone as the
  theme-toggle's `title="Toggle color theme"` / dynamic
  `[attr.aria-label]`, since (unlike the theme toggle) this control's
  purpose doesn't change with state.
- `aria-controls="mobile-menu"` — points at a new `id="mobile-menu"` added
  to the `<aside>` drawer panel it opens/closes (the `<aside
  [class.aside-show]='responsiveMenuVisible'>` further down the same
  template), which didn't have an `id` before.

### CSS: resetting native button chrome

Browsers apply default chrome to `<button>` (border, padding, background,
font) that a bare `<div>` never had. `header.component.scss`'s
`.hamburger-menu` rule (inside `.menu-wrapper`) now resets those so the
button renders identically to the old div — just the three animated bars,
no visible button shape:

```scss
.hamburger-menu {
    display: block;
    position: relative;
    background: $Orange;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    transition: all 0ms 300ms;
    // ...existing :before/:after bar rules and &.animate state, unchanged
}
```

Nothing else in the rule (the bar geometry, the `:before`/`:after`
pseudo-elements, the `&.animate` open-state transform, or the
`.menu-wrapper` flex-centering it relies on — see the existing comment
above `.hamburger-menu` about why centering is done via the wrapper's
`align-items` rather than a `transform`) needed to change: a `<button>`
supports `position: relative` and pseudo-elements exactly like a `<div>`
does, so the whole animated-bars-to-X transition keeps working unmodified.

## Files touched

- `src/app/components/general/header/header.component.html` — `<div>` →
  `<button type="button">`, `aria-expanded`/`aria-label`/`aria-controls`
  added; `id="mobile-menu"` added to the `<aside>` drawer.
- `src/app/components/general/header/header.component.scss` — button
  chrome reset on `.hamburger-menu`.

## Verification

- `npx ng build` — succeeds, no new errors or warnings.
- `npx ng test --watch=false` — all 117 existing specs pass unchanged;
  `header.component.spec.ts` instantiates `HeaderComponent` directly
  rather than through its template (see the suite's own header comment),
  so it doesn't assert on the markup this change touched and needed no
  updates.
- `npx ng serve` + headless Chromium (Playwright) at 480px width:
  - Confirmed the toggle is a real `<button>`, and that `aria-expanded`
    starts `false`, flips to `true` on click (with the drawer's `<aside>`
    gaining its `aside-show` class), and flips back to `false` on a second
    click.
  - Confirmed `aria-label="Toggle menu"` and `aria-controls="mobile-menu"`
    are present, and that `#mobile-menu` resolves to the drawer `<aside>`.
  - Tabbed through the page from a blank focus state and confirmed the
    hamburger button is reachable in sequence (after the logo link and
    theme-toggle button, before the drawer's own links — consistent with
    its position in the DOM); pressed `Enter` and separately `Space` on
    it and confirmed both open and close the drawer identically to a
    mouse click, toggling `aria-expanded` and `aside-show` the same way.
  - No console errors from either interaction path (the only console
    output seen in this sandbox at all is `gtag.js` being blocked by
    network-egress rules — pre-existing and unrelated, per
    `docs/changes/20260803-211756-consolidate-header-scss.md`'s verification notes).
  - Screenshotted the header before/after opening via both mouse and
    keyboard: the closed state shows the same three orange bars in the
    same position as before this change, and both activation paths
    produce the identical animated result — bars morph into an X and the
    drawer slides in with the nav list, pixel-equivalent between the
    mouse and keyboard runs.
