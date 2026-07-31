# Header: translucent scroll state + left-to-right entrance

Three small, related changes around `HeaderComponent`
(`src/app/components/general/header/`): a translucent/blurred navbar once
the page scrolls, switching the existing on-load entrance animation from a
vertical drop to a horizontal left-to-right slide, and deferring that
entrance so it actually plays after the boot-time loading screen instead of
hidden underneath it.

## 1. Translucent + blurred navbar on scroll

`HeaderComponent` already tracked scroll position (`pageYPosition`, via
`@HostListener('window:scroll')`) to toggle a `nav-shadow` class once
`pageYPosition > 0` — used for the shrink-height + box-shadow scroll state.
That same class is applied to both the desktop `<nav class="main-navbar">`
and the mobile fullscreen drawer `<aside class="on-top">`
(`header.component.html`), since both opt into the shrink/shadow look.

For "translucent on scroll," a **new, more specific rule** was added rather
than editing the shared `.nav-shadow` rule directly:

```scss
// header.component.scss
.main-navbar.nav-shadow {
    background: color-mix(in srgb, $Surface 85%, transparent);
    @extend %blur-backdrop; // backdrop-filter: blur(10px) + -webkit- prefix
}
```

Scoping to `.main-navbar.nav-shadow` (rather than `.nav-shadow` alone) means
this specific rule — "translucent, but only once actually scrolled" — only
applies to the bar itself, not the mobile drawer `<aside>` (which also picks
up `.nav-shadow` for its shrink/shadow state, but shouldn't wait on a scroll
position to go translucent — see §4, which gives it its own always-on
translucency instead).

`color-mix(in srgb, $Surface 85%, transparent)` was used instead of `rgba()`
because `$Surface` (`src/variables.scss`) resolves to an MD3 color-role
custom property (`var(--md-sys-color-surface)`, itself aliasing
`--color-navy` — see `documentation/material-design-3-tokens.md`) — not a
bare RGB triplet `rgba()` could blend against. `color-mix` works directly on
any valid CSS color, so the translucent tint automatically follows whichever
theme is active. If a browser doesn't support `color-mix()`, the whole
declaration is invalid at parse time and is dropped, and the element falls
back to `.main-navbar`'s existing solid `$Surface` background — no separate
fallback rule needed.

(This started out as `$Navy` directly; renamed to `$Surface` when the header
was brought onto the MD3 color-role tokens.)

`backdrop-filter: blur(10px)` (+ `-webkit-backdrop-filter` for Safari) blurs
whatever scrolls underneath the bar. The existing `transition: all 0.25s
cubic-bezier(...)` already declared on `.nav-shadow` covers the new
properties too, since it applies to the element as soon as the class is
toggled — no separate transition declaration needed on the new rule.

## 2. Left-to-right entrance animation

The navbar's on-load entrance was already animated via a shared helper,
`fadeStaggerAnimation` (`src/app/animations/fade-stagger.animation.ts`),
also used by the banner and footer components. It queries elements within
the animated host, staggers each one in 50ms apart, animating from
`{ opacity: 0, transform: fromTransform }` to `{ opacity: 1, transform:
'none' }`.

`HeaderComponent` previously passed `'translateY(-50%)'` for `fromTransform`
— content dropped down into place. Changed to `'translateX(-20px)'`:

```ts
// header.component.ts
animations: [
  fadeStaggerAnimation('animateMenu', 'translateX(-20px)', '.container > *')
],
```

(The third argument, and why it's needed here specifically, is new — see §4.)

At the time this was written the stagger walked *every* descendant in
document order — logo, then each menu item left-to-right, then the theme
toggle, then the mobile menu button/drawer markup — and each one slid in
from the left instead of from above, reading as the nav content sweeping in
left-to-right rather than dropping down. `translateX(-20px)` was chosen over
matching the banner's `translateX(-50px)` because the header's elements
(nav text, small icons) are more compact than the banner's large heading
text, so a smaller offset keeps the motion proportional. §4 changed *what*
gets staggered, not this offset or easing.

## 3. Deferring the entrance until the loading screen is done

The left-to-right entrance from §2 turned out to never actually be visible:
`app.component.html` mounts `<app-loading-screen>` and `<app-header>` at the
same time, and `LoadingScreenComponent` is a `position: fixed; inset: 0;
z-index: 9999` overlay with an opaque `$Navy` background
(`loading-screen.component.scss`) that stays up for a fixed minimum
(`MIN_DISPLAY_MS = 1400ms`) plus its own assembly/outro animation — several
seconds in total. The header's `:enter` stagger, by contrast, finishes in a
few hundred ms. It was playing out completely underneath the opaque overlay
and had long since settled by the time the overlay faded away, so nothing
was ever seen.

`LoadingScreenComponent` already had an unused `@Output() finished =
new EventEmitter<void>()`, emitted once its outro timeline's overlay
fade-out completes (`loading-screen.component.ts`'s `playOutro()`) — nothing
was listening to it. Rather than adding a delay/timer to the header itself
(which would need to duplicate the loading screen's own timing and could
drift out of sync with it), the header's *mount* is now deferred until that
event fires, so its `:enter` animation naturally starts right as the
overlay clears:

```html
<!-- app.component.html -->
<app-loading-screen (finished)="onLoadingScreenFinished()"></app-loading-screen>
@if (headerReady) {
  <app-header></app-header>
}
```

```ts
// app.component.ts
headerReady = false;

onLoadingScreenFinished(): void {
  this.headerReady = true;
}
```

Since Angular's `:enter` transition fires on insertion into the DOM, wrapping
`<app-header>` in `@if (headerReady)` (rather than e.g. a CSS
visibility/opacity toggle on an always-mounted header) means the animation
trigger only fires once headerReady flips true — right after the loading
screen's fade-out finishes — instead of at bootstrap.

## 4. The stagger query was quietly making the hamburger invisible for ~1.5s

Follow-up bug, found after the MD3 restructure raised how many descendants
the header actually has. §2's `query('*')` matches *every* descendant of
`<nav>`, at any depth, regardless of whether it's currently visible — and
this component's markup duplicates every nav item twice: once in the
desktop `<ul class="menu-ul">` (hidden via CSS below 1050px, but still in
the DOM), and again inside the mobile drawer `<aside>` (always off-screen
until opened). Between them that's ~40 extra elements, each claiming a 50ms
stagger slot, sitting in DOM order *ahead of* the theme toggle and hamburger
button.

Net effect on mobile: the hamburger sat at `opacity: 0` — present, but
functionally invisible and (worse) genuinely unclickable, since its
mid-animation `transform` also left its actual hit-box offset from where it
visually should be — for over a second after the header itself had already
appeared. A headless-Chromium timing check (poll `getComputedStyle` every
500ms from navigation start) confirmed the hamburger didn't settle to
`opacity: 1` until ~1.5s after `headerReady` flipped, even though it's one
of the very first elements a user would look for.

Fixed by giving `fadeStaggerAnimation` an optional third `selector`
parameter (default `'*'`, so banner/footer — which don't have this
duplicated-subtree problem — are unaffected) and passing the header a
narrower one:

```ts
fadeStaggerAnimation('animateMenu', 'translateX(-20px)', '.container > *')
```

`<nav>`'s only direct child is `.container`, so `.container > *` matches
exactly its 4 logical groups — logo, the desktop nav+toggle wrapper, the
hamburger wrapper, the mobile drawer — and staggers each in as one block
(4 × 50ms = 200ms total spread) instead of every nested `<li>`/`<a>`/`<span>`
individually. The per-item cascade inside the desktop nav list is gone, but
the header now reads as 4 chrome pieces sweeping in together, and the
hamburger is interactive within a couple hundred ms rather than 1.5+
seconds.

## 5. Hamburger tap target was a 1.5px sliver

Separate, unrelated bug surfaced by a user report ("has to be clicked at
the very center"). The click handler lived on `.hamburger-menu` itself:

```html
<!-- before -->
<div class="menu-wrapper">
  <div [class.animate]='responsiveMenuVisible'
       (click)='responsiveMenuVisible = !responsiveMenuVisible'
       class="hamburger-menu"></div>
</div>
```

but per CSS, `.hamburger-menu` is only `36px × 1.5px` — the icon's middle
bar. The top and bottom bars are `::before`/`::after` pseudo-elements, which
aren't separate clickable DOM nodes; they just paint extra pixels that
don't extend the parent's own hit-box. So the *visible* icon reads as a
reasonably sized ~36×20px hamburger, but the actual clickable area was a
razor-thin horizontal line through its exact center — anywhere else inside
the visual icon (which is most of it) did nothing, exactly matching the
report.

Fix: move the handler up to `.menu-wrapper`, the actual `36px × 60px` box
the icon sits inside:

```html
<!-- after -->
<div class="menu-wrapper" (click)='responsiveMenuVisible = !responsiveMenuVisible'>
  <div [class.animate]='responsiveMenuVisible' class="hamburger-menu"></div>
</div>
```

Verified with a synthetic click 5px from the *top* of `.menu-wrapper`'s
bounding box (nowhere near the old 1.5px-tall target) correctly toggling
the drawer open.

## 6. Mobile drawer translucency

Per a follow-up request, the drawer `<aside>` — previously a solid
`$SurfaceContainerHigh` fill (see §1 for why it was deliberately kept
opaque at the time) — now gets the same translucent-blur treatment as the
scrolled nav bar:

```scss
background-color: color-mix(in srgb, $SurfaceContainerHigh 85%, transparent);
@extend %blur-backdrop; // shared with .main-navbar.nav-shadow, see §1
```

Unlike the nav bar's version this one isn't conditional on `.nav-shadow` /
scroll position — the drawer is a modal overlay that's either fully open or
fully off-screen, so there's no "resting" unscrolled state to distinguish it
from.

## 7. Large-screen nav-bar scaling

Unrelated to the animation/interaction fixes above, but landed in the same
pass: `.on-top` height, the logo's width, `.nav-link`/`.nav-number` font
sizes, `.nav-right`'s gap, and `.theme-toggle`'s size all scale up at
1600px/2200px+ viewport widths, matching the same treatment given to body
text, section titles, and the banner/contact hero headings elsewhere on the
site (see `documentation/material-design-3-tokens.md` for the shape/
elevation side of the MD3 work these sit alongside). These rules live in
`src/styles.scss` rather than `header.component.scss`, with `!important` on
each property — not a style choice, but a hard constraint: `header.
component.scss` was already sitting within ~70 bytes of this project's 6kb
`anyComponentStyle` build-error budget by this point (see §5/§6's `%blur-
backdrop`/dead-prefix trims, which existed specifically to claw back room
for §6's translucency change), so a global-stylesheet override was the only
way to add this without either regressing something else out of the file or
loosening the budget itself. `!important` is required rather than optional
here because Angular's emulated view encapsulation adds a component-scoped
attribute selector to every rule in `header.component.scss`, which outranks
a plain selector in `styles.scss` regardless of source order — the same
reason the pre-existing downward `.banner h2/h3` breakpoints in `styles.scss`
already needed it.

## Files touched

- `src/app/components/general/header/header.component.scss` —
  `.main-navbar.nav-shadow` translucency/blur rule (§1); `aside`'s
  translucency (§6); `%blur-backdrop` placeholder and dead `-webkit-box-*`
  prefix removal to stay under budget (§6); `$Navy`/`$SurfaceContainerHigh`
  renamed onto MD3 role tokens.
- `src/app/components/general/header/header.component.html` — hamburger
  click handler moved from `.hamburger-menu` to `.menu-wrapper` (§5).
- `src/app/components/general/header/header.component.ts` — `fromTransform`
  changed from `translateY(-50%)` to `translateX(-20px)` (§2); added the
  `'.container > *'` selector argument to `fadeStaggerAnimation` (§4).
- `src/app/animations/fade-stagger.animation.ts` — added the optional
  `selector` parameter (§4); default `'*'` keeps banner/footer unchanged.
- `src/app/app.component.html` / `.ts` — `<app-header>` mount deferred behind
  `headerReady`, flipped by a new `(finished)` handler on
  `<app-loading-screen>` (see §3).
- `src/styles.scss` — large-screen nav-bar sizing at 1600px/2200px+ (§7).

## Verification

- `./node_modules/.bin/sass --load-path=src src/app/components/general/header/header.component.scss`
  — compiles cleanly, confirms `color-mix()` and the new selector are valid
  SCSS (no dart-sass errors).
- `npm run build` (production) — succeeds; `header.component.scss` sits at
  5.91 kB against the 5 kB *warning* threshold (non-blocking) and comfortably
  under the 6 kB *error* threshold after the §6 trims.
- `tsc --noEmit -p tsconfig.app.json` — no type errors after wiring
  `AppComponent.headerReady` / `onLoadingScreenFinished()` (§3). `ng build`
  itself could not be run in this environment (Angular CLI's Node version
  floor is one patch release above what's installed here), so the template
  binding (`(finished)`, `@if`) was reviewed by hand against the same `@if`
  syntax already used elsewhere in this codebase (e.g.
  `header.component.html`).
- §4 (stagger scoping): headless-Chromium timing check polling
  `.hamburger-menu`'s computed `opacity`/`transform` every 500ms from page
  load — before the fix it didn't settle until ~4.5s in (loading screen +
  ~1.5s of queued stagger delay); after, it settles within a couple hundred
  ms of the header mounting. Re-verified against a full production build
  (`ng build` output served via `http-server`), not just `ng serve`, since
  the two can behave differently for AOT/animation timing.
- §5 (tap target): synthetic click 5px from the top of `.menu-wrapper`'s
  bounding box (well outside the old 1.5px-tall `.hamburger-menu` hit
  target) correctly toggles `aside`'s `right` from `-100vw` to `0px`; also
  re-ran the full open → close → reopen cycle to confirm no regressions.
- §6 (translucency): confirmed `aside`'s computed `background-color` carries
  an alpha channel and `backdrop-filter` reports `blur(10px)` after opening
  the drawer; screenshotted to visually confirm the underlying page blurs
  through.
- §7 (nav-bar scaling): confirmed computed sizes for `.on-top`, `.navbar-
  brand img`, `.nav-link`, `.nav-number`, `.theme-toggle`, and `.nav-right`'s
  `gap` at a 2200px viewport match the `!important` overrides, and
  screenshotted to confirm the nav bar reads proportionally larger alongside
  the already-scaled banner text.
