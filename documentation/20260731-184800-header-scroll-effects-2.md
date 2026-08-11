Date: 2026-07-31 18:48:00

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
    background: color-mix(in srgb, $Navy 85%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}
```

Scoping to `.main-navbar.nav-shadow` (rather than `.nav-shadow` alone) keeps
the mobile drawer's background solid — it's a full-screen menu overlay, not
a compact bar, so translucency there would make its own contents (and the
page behind it) fight for legibility.

`color-mix(in srgb, $Navy 85%, transparent)` was used instead of `rgba()`
because `$Navy` (`src/variables.scss`) resolves to `var(--color-navy)`, a
per-theme hex custom property (`src/theme.scss`, three values: default/
light/dark) — not a bare RGB triplet `rgba()` could blend against. `color-mix`
works directly on any valid CSS color, so the translucent tint automatically
follows whichever theme is active. If a browser doesn't support
`color-mix()`, the whole declaration is invalid at parse time and is
dropped, and the element falls back to `.main-navbar`'s existing solid
`$Navy` background — no separate fallback rule needed.

`backdrop-filter: blur(10px)` (+ `-webkit-backdrop-filter` for Safari) blurs
whatever scrolls underneath the bar. The existing `transition: all 0.25s
cubic-bezier(...)` already declared on `.nav-shadow` covers the new
properties too, since it applies to the element as soon as the class is
toggled — no separate transition declaration needed on the new rule.

## 2. Left-to-right entrance animation

The navbar's on-load entrance was already animated via a shared helper,
`fadeStaggerAnimation` (`src/app/animations/fade-stagger.animation.ts`),
also used by the banner and footer components. It queries every descendant
of the animated host, staggers each one in 50ms apart, animating from
`{ opacity: 0, transform: fromTransform }` to `{ opacity: 1, transform:
'none' }`.

`HeaderComponent` previously passed `'translateY(-50%)'` for `fromTransform`
— content dropped down into place. Changed to `'translateX(-20px)'`:

```ts
// header.component.ts
animations: [
  fadeStaggerAnimation('animateMenu', 'translateX(-20px)')
],
```

Since the stagger walks descendants in document order — logo, then each
menu item left-to-right, then the theme toggle, then the mobile menu
button/drawer markup — and each one now slides in from the left instead of
from above, the visible effect on load reads as the nav content sweeping in
left-to-right rather than dropping down. `translateX(-20px)` was chosen over
matching the banner's `translateX(-50px)` because the header's elements
(nav text, small icons) are more compact than the banner's large heading
text, so a smaller offset keeps the motion proportional.

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

## Files touched

- `src/app/components/general/header/header.component.scss` — new
  `.main-navbar.nav-shadow` translucency/blur rule.
- `src/app/components/general/header/header.component.ts` — `fromTransform`
  changed from `translateY(-50%)` to `translateX(-20px)` in the
  `fadeStaggerAnimation('animateMenu', ...)` call.
- `src/app/app.component.html` / `.ts` — `<app-header>` mount deferred behind
  `headerReady`, flipped by a new `(finished)` handler on
  `<app-loading-screen>` (see §3).

## Verification

- `./node_modules/.bin/sass --load-path=src src/app/components/general/header/header.component.scss`
  — compiles cleanly, confirms `color-mix()` and the new selector are valid
  SCSS (no dart-sass errors).
- `npm run build` (production) — succeeds; emits a pre-existing-style
  `anyComponentStyle` budget **warning** (not an error) for
  `header.component.scss`, currently ~5.5 kB against a 5 kB warning
  threshold (error threshold is 6 kB). Non-blocking; noted here in case a
  future change to this file needs to be weighed against that budget.
- `tsc --noEmit -p tsconfig.app.json` — no type errors after wiring
  `AppComponent.headerReady` / `onLoadingScreenFinished()` (§3). `ng build`
  itself could not be run in this environment (Angular CLI's Node version
  floor is one patch release above what's installed here), so the template
  binding (`(finished)`, `@if`) was reviewed by hand against the same `@if`
  syntax already used elsewhere in this codebase (e.g.
  `header.component.html`).
