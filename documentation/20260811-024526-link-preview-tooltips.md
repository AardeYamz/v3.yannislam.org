Date: 2026-08-11 02:45:26

# Hover-preview tooltips for social icons and banner links

## Context

Requested feature: hovering the social media icons (footer's left sidebar
and mobile socials list) and the orange-highlighted phrases in the banner's
intro paragraph should show a preview of the linked page.

A literal "live page" preview (an embedded `<iframe>` of the real site) was
considered and ruled out before implementation: LinkedIn, Facebook,
Instagram, and TikTok all block being framed via `X-Frame-Options`/CSP, so
that iframe would render blank for most of the actual targets here, and
there's no reliable way to detect the failure client-side (a blocked frame
still fires `load`, not `error`). Asked the user directly; the chosen
approach is a **rich link-preview card** — icon, title, and domain, styled
like the link-preview cards in Slack/iMessage — which always renders
something useful.

## Targets

- Footer social icons (`socials`/`mobileSocials`, from
  `config.json`'s `about.contact`): LinkedIn, GitHub, TikTok, Facebook,
  Instagram. Email is skipped — `mailto:` has no "page" to preview (see
  `isPreviewableUrl` below).
- Banner blurb (`config.json`'s `banner.blurb`), three phrases that were
  previously just orange styled text (`<span class="underline">`, no link
  at all):
  - "Full Stack Software Developer" → the user's LinkedIn profile
    (`https://linkedin.com/in/yannis-lam/`) — a job-title phrase has no
    natural external page of its own; asked the user, who chose treating it
    as shorthand for "see my professional profile" over leaving it
    unlinked.
  - "Voya Financial" → `https://www.voya.com/`
  - "University of Massachusetts Amherst" → `https://www.umass.edu/`

  All three are now real `<a>` tags (previously plain `<span>`s), so they
  also gained real navigation on click, not just the hover preview.

## Two rendering contexts, two directives

The footer's social links and the banner's blurb text are compiled
completely differently by Angular, which drove the split into two
directives sharing one service:

- **Footer** — `@for (social of socials; ...)` in `footer.component.html`
  is a normal Angular template; Angular compiles it, so a directive with a
  bound `@Input()` works directly: `[appLinkPreview]="{ icon: 'fab ' +
  social.icon, title: social.name, url: social.url }"`.
- **Banner** — `banner.component.html` renders `data.banner.blurb[i]` via
  `[innerHTML]`, a raw HTML string from `config.json`. Angular never
  compiles that markup — it's inert HTML dropped into the DOM — so
  directives/host bindings placed on elements *inside* it can't attach at
  all. `appLinkPreviewDelegate` instead sits on the real, Angular-rendered
  container around it (`.banner-description`) and does plain-DOM event
  delegation (`mouseover`/`mouseout`/`focusin`/`focusout`, all of which
  bubble, unlike `mouseenter`/`mouseleave`/`focus`/`blur`), matching
  descendant `<a href>` elements via `event.target.closest(...)`.

  A second constraint shaped the delegate directive: Angular's `[innerHTML]`
  sanitizer strips any attribute not on its own fixed allowlist (`href`,
  `class`, `target`, `rel`, `title`, etc.) — confirmed by reading
  `_sanitizeHtml`'s `VALID_ATTRS` in `@angular/core`'s bundled source, which
  has no `data-*` entry at all. An initial design that stashed the icon
  class in `data-preview-icon="..."` silently lost that attribute on every
  render. Fixed by dropping data attributes entirely: the delegate
  directive resolves the icon from the link's own `href` domain instead
  (`iconForUrl` in `link-preview-card.ts`), with a generic
  `fas fa-up-right-from-square` fallback for domains with no dedicated
  brand icon (Voya, UMass) rather than hardcoding a `domain → icon` map for
  every possible target in code.

## Shared pieces

- `src/app/directives/link-preview/link-preview-card.ts` — pure functions:
  `isPreviewableUrl` (only `http(s)://`, so `mailto:` links no-op),
  `domainFromUrl` (strips `www.`), `iconForUrl` (domain → FontAwesome class,
  delegate-directive-only as above).
- `src/app/directives/link-preview/link-preview.service.ts` — one
  `providedIn: 'root'` singleton card, not one DOM node per trigger (only
  one preview is ever visible at a time). Built with plain `document.*` DOM
  APIs (not `Renderer2`) since it's appended to `document.body`, outside
  any component's view. `show(host, data)` positions it `position: fixed`
  above the trigger (flips below if that would go off the top of the
  viewport), clamps horizontally to the viewport, and hides on `window`
  scroll (capture phase) since a fixed-position card computed once on show
  goes stale the moment the page scrolls. Guarded with the same
  `PLATFORM_ID`/`isPlatformBrowser` pattern used elsewhere in this codebase
  for prerender-safety, though in practice `show()` is only ever reachable
  from a real pointer/focus event, which can't fire during SSR anyway.
- `src/link-preview.scss` — new global stylesheet (added to `angular.json`'s
  `styles` array, same pattern as `aos.scss`) for `.link-preview-card` and
  its children. Global, not component-scoped, because the card lives
  outside any component's view.

## Files touched

- New: `src/app/directives/link-preview/{link-preview-card.ts,
  link-preview.service.ts, link-preview.directive.ts,
  link-preview-delegate.directive.ts}` + one spec file per unit.
- New: `src/link-preview.scss`.
- `angular.json` — registered `src/link-preview.scss` in the build `styles`
  array.
- `src/app/components/general/general.module.ts` — imports
  `LinkPreviewDirective` (standalone, so it goes in `imports`, not
  `declarations` — same pattern as `AosDirective`/`LogoFallbackDirective`).
- `src/app/components/home/home.module.ts` — imports
  `LinkPreviewDelegateDirective`.
- `src/app/components/general/footer/footer.component.html` — added
  `[appLinkPreview]` to both social-link `@for` loops.
- `src/app/components/general/footer/footer.component.spec.ts` — added
  `LinkPreviewDirective` to the TestBed's `imports`; without it, Angular's
  strict-templates compiler throws `NG0303: Can't bind to 'appLinkPreview'
  since it isn't a known property of 'a'` even though the plain app build
  is unaffected (`FooterComponent`'s real `@NgModule`, `GeneralModule`,
  already imports it) — the isolated spec's `TestBed.configureTestingModule`
  doesn't pull in `GeneralModule`, so it needs its own explicit import.
- `src/app/components/home/banner/banner.component.html` — added
  `appLinkPreviewDelegate` to `.banner-description`.
- `src/assets/config.json` — `banner.blurb`'s three
  `<span class="underline">` phrases replaced with real
  `<a class="underline" href="..." target="_blank" rel="noopener noreferrer">`
  links.

## Verification

`ng build` (with this environment's usual local `node_modules` Node-version
patch, same caveat as the SSR prerendering doc above) completes cleanly.
Confirmed in the actual build output:

- All three banner links survive Angular's `[innerHTML]` sanitizer intact
  (`href`/`class`/`target`/`rel` all present) in every prerendered route's
  `index.html`.
- `.link-preview-card` rules present in the bundled `styles-*.css`.
- The footer's `<a>` elements carry the `[appLinkPreview]` binding's
  compiled output correctly.

Full Karma/Jasmine suite: 137 specs (117 existing + 20 new for this
feature), all passing.

**Real hover interaction**, not just static output, was verified with a
throwaway Playwright script (`npm install --no-save playwright`, matching
the one-off-tooling precedent set by the `sharp` install in
`20260731-184800-seo-fixes-4.md` — not added to `package.json`) against the
actual prerendered build served with its real client bundle attached (same
method the SSR prerendering doc above used for hydration testing — `ng
serve` never prerenders anything, so it can't stand in for this):

- Hovering the footer's LinkedIn icon shows a card reading "Linkedin /
  linkedin.com"; moving the mouse away hides it.
- Hovering "Voya Financial" in the banner shows "Voya Financial / voya.com";
  hovering "University of Massachusetts Amherst" shows "University of
  Massachusetts Amherst / umass.edu".
- Screenshots confirmed the card renders legibly against the site's real
  (light-mode) theme, correctly positioned above the hovered element.
- One non-issue surfaced during testing worth recording: an early test that
  chained `scrollIntoViewIfNeeded()` immediately before `hover()` sometimes
  showed the *previous* link's content with the card not visible. Isolating
  the mouse move (no scroll immediately before) reproduced the correct
  behavior every time — Playwright's `.hover()` moves the pointer along a
  realistic path from its current position, which can genuinely cross
  earlier links in the paragraph en route, firing (and immediately
  superseding) their preview first. That's expected behavior for a
  hover-delegation implementation, not a bug in it.
