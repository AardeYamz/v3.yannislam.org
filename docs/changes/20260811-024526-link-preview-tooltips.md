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

## Follow-up: attempt a live iframe preview before falling back to the card

Reported after the above shipped: the user wanted the "live page" option
reconsidered — try embedding the real target page first, and only fall back
to the icon/title/domain card if that fails.

### Approach

`LinkPreviewService.show()` now always displays the fallback card
immediately (unchanged - it's the known-good baseline), then separately
calls `attemptIframe(url)`, which points a hidden real `<iframe>` at the
target and decides whether to reveal it based on how its `load` event
behaves:

- The iframe is rendered at a real desktop size (1120×700) and CSS-scaled
  down (`transform: scale(0.25)`) to fit the card (280×175), clipped by an
  `overflow: hidden` wrapper - so a target page lays out the way it
  actually does full-size instead of squashing into a tiny viewport and
  looking broken regardless of whether framing succeeded.
- `sandbox="allow-scripts"` (no `allow-top-navigation*`, no
  `allow-same-origin`) - loaded scripts still run so the page looks right,
  but the frame can never navigate the top-level tab even if the target
  page defends against being framed with a `top.location = ...` redirect
  script rather than (or in addition to) an `X-Frame-Options` header. No
  `allow-same-origin` also means the framed page can't read/write real
  cookies for that site, so it won't render as "logged in" even if the
  visitor has a session with it elsewhere - a privacy plus, not just a
  security one.
- `referrerpolicy="no-referrer"` so hovering doesn't send the visitor's
  presence on this site to every linked platform as a referrer on every
  hover.

### The core problem: there is no reliable "was this blocked" signal

A blocked (`X-Frame-Options`/CSP) navigation still fires the iframe's
`load` event - the browser just refuses to paint the response, it doesn't
refuse to load it. The working theory going in was that a blocked load
resolves faster than a real one, since nothing actually gets rendered.
Verified against a local test server: a `X-Frame-Options: DENY` response
resolved in ~50ms locally vs. ~145ms for a deliberately-delayed real page -
looked like a clean, usable signal.

That result doesn't hold up once real network latency is added to *both*
sides of the comparison, though, which a second local test made concrete:
delaying the blocked response by a simulated 180ms round trip (still far
below real internet latency to LinkedIn et al.) pushed its resolution time
past 200ms too - because the block happens via an HTTP response *header*,
which still requires the full DNS+TLS+request/response round trip before
the browser can even see it. "Blocked" and "real-but-quick" become
genuinely hard to tell apart once both need the same network trip. There's
no fallback signal available either: `iframe.contentDocument` on a
cross-origin frame is `null` regardless of whether the load was blocked or
genuinely succeeded - that's the browser's cross-origin isolation kicking
in either way, not something specific to being blocked.

Given that, and that several of this app's actual targets (LinkedIn,
GitHub, Facebook, Instagram, TikTok) are all but certain to block framing
in production, the failure mode of guessing wrong in the "real" direction
is a visibly blank box flashing above the caption before (if ever) real
content arrives - worse than just showing the clean card, which is what
was happening before this change. Asked the user how to weight that
tradeoff; chose biasing the threshold conservatively toward the safe
fallback (`MIN_REAL_LOAD_MS = 800`, well above realistic round-trip time)
over either leaving it aggressive (~200ms, un-tuned) or skipping the
attempt entirely for the platforms already known to block it. Re-verified
against the same local server with the new threshold: the 180ms-RTT
blocked case now correctly resolves `'blocked'` (215ms, comfortably under
800), and the delayed real case (900ms) correctly resolves `'real'`.
`IFRAME_TIMEOUT_MS` (falls back if `load` never fires, seen with some CSP
`frame-ancestors` cases that cancel navigation pre-commit) raised to 2600ms
alongside it, to keep a genuinely slow-but-real load a fair chance to clear
the higher bar before that cuts it off.

### Files touched

- `src/app/directives/link-preview/link-preview.service.ts` -
  `attemptIframe()`, the iframe element itself, and the
  `link-preview-card--iframe` mode toggle. An `attemptToken` counter
  invalidates any in-flight attempt's eventual `load`/timeout callback once
  a newer `show()` or a `hide()` has superseded it, so a late signal from
  an abandoned hover can't retroactively flip the card's state.
- `src/link-preview.scss` - `&__frame-wrap`/`&__frame`/`&--iframe` rules;
  restructured the card's icon/title/domain markup into a `&__caption`
  block so it can sit as a compact footer under the live preview instead
  of being the card's only content.
- `link-preview.service.spec.ts` - new cases for the iframe src wiring,
  the succeed/fail classification (via `spyOn(performance, 'now')` rather
  than real waits, so the suite stays fast and deterministic), the
  late-callback-after-hide guard, and hide() resetting the iframe to
  `about:blank` to stop it loading in the background.

### Verification

Full Karma/Jasmine suite: 143 specs, all passing (`ng build` also still
completes cleanly). The succeed/fail *classification logic* is covered by
mocked-timing unit tests as above; the underlying *browser behavior it
depends on* (does a real `X-Frame-Options: DENY` response actually resolve
`load` fast, does a real allowed page actually resolve it slow) was
validated against a local Node test server standing in for both cases, not
against the actual internet - this sandbox's network egress proxy 403s
requests to linkedin.com, github.com, voya.com, umass.edu, etc. outright
(confirmed with `curl -I`), so there was no way to exercise the real
targets end-to-end here. Confirmed the safe path holds even when the
target is entirely unreachable (rather than actively blocked): hovering
"Voya Financial" against the real prerendered build in this sandbox - where
the request to voya.com fails outright - correctly stays on the clean
fallback card with no blank-box artifact, screenshotted for confirmation.
**Not verified**: the "succeeds and shows a live thumbnail" path against a
real allowing site, and the actual blocked-timing behavior of the real
target platforms under real internet latency (only a local stand-in for
both was available) - worth a spot-check after this deploys somewhere with
normal internet access.
