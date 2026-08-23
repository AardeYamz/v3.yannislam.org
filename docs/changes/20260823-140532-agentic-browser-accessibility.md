Date: 2026-08-23 14:05:32

# Agentic Browser Accessibility Fixes

Made the header nav, mobile drawer, and icon-only links more reliable for
assistive tech and browser-automation agents (which typically drive a page
via its accessibility tree — link `href`s, accessible names, focus order —
rather than pixel coordinates).

## Nav links now have real `href`s

`header.component.html`'s desktop and mobile nav `<a>` elements had no
`href`, only a `(click)` handler. An anchor without `href` isn't exposed as
`role="link"` and isn't part of the default tab order, so screen readers and
automation agents couldn't identify or activate them as links — only a
sighted mouse user clicking the rendered text worked.

Each menu item already carries a real destination in `config.json`
(`siteLocation`, e.g. `/#about`, `/projects`, `/aardeyamz`), so both `<a>`s
now bind `[attr.href]="menuItem?.siteLocation"`. `HeaderComponent.navigate()`
takes the click `Event` and calls `preventDefault()` so the existing
smooth-scroll/router behavior is unchanged — the href only matters for
non-JS navigation, keyboard/AT interaction, and middle-click/"open in new
tab".

## Closed mobile drawer is now `inert`

The mobile nav drawer (`aside#mobile-menu`) is positioned off-screen via
`right: -100vw` when closed, but stays `display: flex` in the DOM with no
`aria-hidden`/`inert`, so its links remained keyboard/AT-focusable while
invisible — tabbing through the page (or an agent walking the accessibility
tree) could land on links with no visible target. Added
`[attr.inert]="responsiveMenuVisible ? null : ''"`, the same pattern already
used for `footer.component.html`'s bottom-contact reveal.

Also gave the two sibling `<nav>` landmarks (`main-navbar` and the drawer's
own `<nav>`) `aria-label="Primary"` / `aria-label="Mobile"` so landmark
navigation can tell them apart instead of announcing "navigation" twice.

## Icon-only links now have accessible names

Several links contained only a Font Awesome `<i>` icon with no text and no
`aria-label`, giving them an empty accessible name:

- Footer social links (desktop sidebar, mobile row, and bottom-contact row)
  — now `[attr.aria-label]="social.name"`.
- Workhistory/project cards' external-link and demo-link icons — now
  `[attr.aria-label]="'View ' + exp.title + ' project'"` /
  `"'View ' + exp.title + ' demo'"`.

The footer's email link already had an `aria-label`; these bring the rest
of the icon-only links in line with that existing pattern.

## Verification

- `npx tsc --noEmit` — clean.
- `ng build` (production) — succeeds; only pre-existing, unrelated Sass
  deprecation warnings and a pre-existing header SCSS budget warning.
- `ng test` for `header`, `footer`, and `workhistory` specs — 28/28 passing.
