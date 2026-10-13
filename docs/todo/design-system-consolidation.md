# Design System Consolidation

A proposal for simplifying the site's design system, written for review by a
person or an agent. Nothing here is implemented yet.

It builds on the extraction recorded in
`docs/changes/20260922-150954-design-system-extraction.md`. That extraction
catalogued the system as it is. This document says what to cut, merge and
move so there is less of it to keep consistent.

## How to review this

Each recommendation carries the **evidence** for it (files, line numbers and
counts taken from the source at the time of writing), the **change**, its
**risk**, and **how to verify** it. The recommendations are grouped into
three phases, ordered by risk:

- **Phase 1** changes no pixels. It can be reviewed from the diff alone.
- **Phase 2** restructures code and should still change no pixels. It needs
  the before/after screenshot check described under Verification.
- **Phase 3** changes how the site looks. Each item needs a design decision
  first, and those decisions are collected under Decisions for the reviewer.

Items marked **Decision** need a reviewer's call before anyone builds them.
Everything else is mechanical and can go ahead once its phase is approved.

Counts come from `grep` over `src/` and will drift as the code changes. Re-run
them before starting a phase; the commands are given inline where they are
not obvious.

## The short version

The system works. The cost is that the same thing is written down in several
places, so every change has to be made several times and it is easy to miss
one. Three moves take out most of that:

1. **One naming layer.** Colours are named three ways today — palette
   (`--color-navy`), SCSS alias (`$Navy`) and Material 3 role
   (`--md-sys-color-surface`). Components should only ever see roles.
2. **One source of truth.** The mode colours live in `theme.scss` *and* in
   TypeScript. The logo's geometry lives in twelve files. Each should live
   once.
3. **Only what is used.** 14 of the 23 Material 3 colour roles are declared,
   themed per mode, and never referenced. Declared-but-unused tokens are the
   ones that silently go stale.

The rest is mechanical cleanup (hand-written vendor prefixes, duplicate
declarations, an easing curve pasted 19 times), plus four visual decisions
that should be made deliberately rather than drift.

## Where things stand

| Measure | Now |
| --- | --- |
| Ways to name one colour | 3 (palette, SCSS alias, M3 role) |
| M3 colour roles declared / used | 23 / 9 |
| Component references that bypass roles | 15, in 3 files |
| Places the mode colours are defined | 3 (`theme.scss`, `theme.service.ts`, `loading-screen.component.ts`) |
| Copies of the logo geometry | 12 (11 SVG files + the loading-screen template) |
| `!important` in stylesheets | 64, of which 39 in `styles.scss` |
| Distinct `@media` conditions | 16 |
| Distinct `font-size` values | 28 |
| Hand-written vendor-prefixed declarations | ~60, in 6 files |
| Copies of `cubic-bezier(0.645, 0.045, 0.355, 1)` | 19, in 5 files |

## Phase 1 — no visual change

### 1.1 Route every colour through a role

**Evidence.** Three component stylesheets reach past the roles to the palette:

- `footer.component.scss` uses `$LightSlate` 9 times (lines 4, 13, 123, 128,
  144, 148, 196, 224, 255) and `$Orange` twice (258, 261).
- `namecard.component.scss` uses `$White` 3 times (84, 116, 122).
- `education.component.scss` uses `$LightSlate` once (115).

**Change.** Replace each with the role it is standing in for. `$Orange` is
`$Primary`. `$LightSlate` is `$Secondary` (which aliases it exactly).
`$White` has no role equivalent today, so the reviewer picks between
`$OnSurface` (a small visible change) and adding a role for it.

Then delete the palette aliases (`$Navy` … `$OrangeOpacity`) from
`variables.scss` so nothing can regress. The `--color-*` custom properties
stay, as the private layer the roles alias.

**Risk.** None for `$Orange` and `$LightSlate`. `$White` is a **Decision**.

**Verify.** After the change, this returns nothing:
`grep -rnE '\$(Navy|LightNavy|LightestNavy|Slate|LightSlate|LightestSlate|White|Orange|OrangeOpacity)\b' src/app`

### 1.2 Replace the colour literals

**Evidence.** Three literals bypass the tokens entirely:

- `workhistory.component.scss:236` — `box-shadow: inset 0 0 5px #8892b0` on
  the scrollbar track. `#8892b0` is `default` mode's `--color-slate`
  hard-coded, so it **does not change in light or dark mode**. This is a
  small theming bug, not just a style issue.
- `workhistory.component.scss:212,216` — carousel dots in `white !important`
  and `#ffffff33`. These will not adapt to light mode either; whether that is
  visible depends on what the dots sit over, so check it in the browser.
- `banner.component.scss:35` — `color: #fff` under the name gradient. This
  one is intentional (it is the solid fallback the gradient paints over) and
  should stay.

**Change.** Point the scrollbar track at `$OnSurfaceVariant`. Point the dots
at `$OnSurfaceVariant` / `$Primary` if the browser check shows they are
meant to track the mode.

**Risk.** Low. The scrollbar track gains the correct colour in light and dark
mode, which is a visible (and intended) change there.

### 1.3 Make the site's easing a token

**Evidence.** `cubic-bezier(0.645, 0.045, 0.355, 1)` is written out 19 times
across `styles.scss`, `header`, `footer`, `education` and `workhistory`.
Meanwhile the one easing that *is* a token, `--md-sys-motion-easing-standard`,
has exactly one consumer: the `md-state-layer` mixin.

**Change.** Add `--motion-easing-site` in `theme.scss` beside the existing
easing token, plus a `$MotionEasingSite` alias, and replace all 19. Also
tokenise the name-card accordion's `cubic-bezier(0.55, 0.055, 0.675, 0.19)`,
which appears 6 times in `namecard.component.scss`.

**Risk.** None — identical computed values.

### 1.4 Delete hand-written vendor prefixes

**Evidence.** About 60 prefixed declarations written by hand
(`display: -webkit-box`, `-ms-flexbox`, `-webkit-transition`,
`-webkit-align-items`, `-moz-letter-spacing` and so on) across
`namecard` (16), `contact` (15), `education` (13), `styles.scss` (8),
`workhistory` (6) and `footer` (4). They read as leftovers from an older
toolchain.

**Change.** Delete them, keeping the unprefixed property. Angular's build runs
Autoprefixer against the project's browserslist, so any prefix a supported
browser still needs comes back automatically.

**Risk.** Low, provided the verification is done: build before and after and
diff the compiled CSS. Any prefix that is still needed will reappear in the
"after" output; any that doesn't reappear was not needed.

### 1.5 Remove duplicate declarations

**Evidence.** Rules that set the same property twice, where only the last one
applies:

- `styles.scss` `.section-title` — `margin: 10px 0 40px` (line 73) then
  `margin: 0 0 10px 0` (line 80).
- `contact.component.scss` `.contact` — `max-width: 1000px` (6) then
  `600px` (8); `margin: 0 auto` twice (5, 9). `.contact-pre-title` sets
  `display`, `font-size` and `margin` twice each.
- `education.component.scss` tab link — `display: inline-block` (55) then a
  flex run (66–69); the same `transition` twice (63–64 and 78).

**Change.** Keep the declaration that currently wins, delete the rest.

**Risk.** None — this removes only overridden values, so computed styles are
identical. Verify with the same compiled-CSS diff as 1.4.

## Phase 2 — restructure, still no intended visual change

### 2.1 Prune the unused tokens — **Decision**

**Evidence.** Of the 23 `--md-sys-color-*` roles, 14 are never referenced:
`on-primary`, `primary-container`, `on-primary-container`, `secondary`,
`on-secondary`, `on-secondary-container`, `background`, `on-background`,
`surface-container-lowest`, `surface-container-low`,
`surface-container-highest`, `inverse-surface`, `inverse-on-surface`,
`scrim`. Also unused: `--color-orange-opacity`, shapes `none` and
`extra-large`, elevations `0`, `4` and `5`, and
`--md-sys-state-dragged-opacity`.

The unused set carries the system's most intricate code. The light-mode
flip of `on-primary` / `on-secondary` — the only roles that cannot simply
alias the palette — serves no consumer. Three of the four `color-mix()` roles
are unused too.

**Change.** Two defensible options:

- **Prune** to the tokens in use. `theme.scss` loses about half its role
  declarations and all the flip logic. Re-add a role the day something needs
  it.
- **Keep the full M3 set on purpose**, and say so in `theme.scss`, so the
  next reader does not mistake it for dead code.

**Recommendation: prune.** The site is one person's portfolio, not a shared
library with unknown consumers. Every role here is one more value to
re-check across three modes whenever a colour changes, and a role nobody
uses is also one nobody notices going wrong.

**Risk.** None if the counts are re-checked first (`grep -rn -- '--md-sys-…'`
and the matching `$Alias` for each).

### 2.2 One source for the mode colours

**Evidence.** The ground and accent for each mode are written in three
places:

- `theme.scss` — the real definitions.
- `theme.service.ts:14–24` — `NAVY_BY_MODE` and `ORANGE_BY_MODE` mirror
  them, for the browser `theme-color` meta tag and the logo-fallback SVG.
- `loading-screen.component.ts:63–64` — hard-codes `#000000` / `#ffffff` for
  the light and dark intro, mirroring `black.svg` and `white.svg`.

`logo-fallback.ts:33` also defaults to `'#ffa500'`.

Changing a mode's accent today means editing `theme.scss` *and*
`theme.service.ts`, and nothing fails if you forget the second.

**Change.** Pick one of these:

- **Read at runtime.** `getComputedStyle(document.documentElement)` inside
  `ThemeService`, after the mode is applied. Small change, but SSR has no
  computed style, so the server render needs a fallback.
- **Generate both sides from one file.** Keep the mode values in a JSON
  tokens file, then generate the `theme.scss` blocks and a TS constant from
  it, alongside the existing resume-manifest pre-build hook. Adds a build
  step, but survives SSR and keeps the values greppable.

**Recommendation: generate from one file.** SSR is already load-bearing here
(`20260811-013939-ssr-prerendering.md`), and the generated file doubles as
the input for the design-system artifact's `tokens.json`.

**Risk.** Medium (touches the build). Verify that the prerendered HTML's
`theme-color` meta is unchanged, and that all three modes render identically.

### 2.3 One source for the logo

**Evidence.** The logo's 11 polygons are written out 12 times: once in each
file in `src/assets/images/logos/` (identical geometry, only the `fill`
changes) and once more inline in `loading-screen.component.html`, which also
re-implements the per-mode colour choice in `pieceFill()`.

**Change.** Keep the geometry once — a small TS module exporting the 11 point
lists and their full-colour fills — and render it through one
`<app-logo [variant]>` component as inline SVG, with fills from CSS. The
header, the floating field and the loading screen all use that component.
If `<img>` files are still wanted anywhere, generate them from the module at
build time rather than keeping them by hand.

The component would also fix two open issues:

- **The spin wobble.** The ink sits 44 units right of the 800-unit box's
  centre, so rotating the box makes the ink orbit — about 3px at 55px. Open
  PR #73 fixes this by recropping all 11 files to `118.5 80 651 651`. With
  one source, that crop is one edit instead of eleven.
- **Floating logos vanishing in light mode.** On the light-mode ground,
  `yellow` (1.04:1), `cream` (1.14:1), `lime` (1.30:1) and `gold` (1.37:1)
  are close to invisible even at full opacity. A component can choose the
  field's colours per mode instead of from one fixed list of nine.

**Risk.** Medium. The loading-screen animation targets `.logo-piece`
elements by class, so the component has to keep that structure.

### 2.4 One breakpoint map

**Evidence.** 16 distinct `@media` conditions. `1050px` alone is written
four ways (`max-width: 1050px`, `@media(max-width: 1050px)`,
`min-width: 1050px`, `min-width: 768px and max-width: 1050px`). There are
also one-off `1000px`, `1100px`, `1300px`, `992px`, `500px` and `376px`, and
`max-width: 30em`, which is `480px` written differently.

**Change.** A `$breakpoints` map in `variables.scss` with named steps —
proposed `sm 480`, `md 768`, `lg 1050`, `xl 1600`, `xxl 2200` — and
`up()` / `down()` mixins. Move each one-off to the nearest step.

**Risk.** Low for exact matches. Each one-off that moves to a new value is a
small visual change at that width, so list them in the PR and check each.

### 2.5 One eyebrow

**Evidence.** The "mono line in the accent colour" pattern is built
separately in at least five places: the banner's `h1`, `.contact-pre-title`,
`.n-section-title`, `.feature-workhistory` and `.nav-number`. There are 18
`font-family: $CodeFont` declarations in total.

**Change.** A `%eyebrow` placeholder (mono font, `$Primary`, `line-height`)
that each of these `@extend`s, keeping only its own size.

**Risk.** Low.

## Phase 3 — visual changes, decide first

### 3.1 Fix the two contrast failures — **Decision**

Both are documented in the extraction write-up:

- **The light-mode accent** (`#d9720c` on `#f4f1ea`) is **2.94:1**. It carries
  13px nav labels, 13px button text and 16px eyebrows, all of which need
  4.5:1. Moving `--color-orange` toward `#9a4f06` clears it, at the cost of a
  browner accent in that mode.
- **Dark-mode body text** (`#6b7590` on `#05070c`) is **4.39:1** — the global
  body ink, just under 4.5:1. Lightening `--color-slate` in the dark block by
  about one step clears it.

The second is a near-invisible adjustment. The first changes the look of the
light mode, so it needs a design call.

### 3.2 Scale large screens with rem instead of `!important` — **Decision**

**Evidence.** The `min-width: 1600px` and `min-width: 2200px` blocks at the
bottom of `styles.scss` hold most of its 39 `!important` flags. They exist
because a global selector cannot outrank a component's view-encapsulated
selector without one (the comment at the top of that block says so). Each new
component that needs to scale has to be added to both blocks by hand.

**Change.** Express component sizes in `rem`, and step the root font size at
the two breakpoints. Then one rule per breakpoint scales everything, and the
`!important` overrides can go. The sizes already step by similar ratios —
body 20 → 22 → 24px, section title 32 → 38 → 44px — so most map cleanly to
one root step. `clamp()` for fluid type is the other option.

**Risk.** Medium to high: it touches every component's sizing. Take it one
component at a time, with screenshots at 1440, 1600 and 2200px.

### 3.3 A type scale — **Decision**

**Evidence.** 28 distinct `font-size` values between 12px and 120px. Some are
genuine responsive steps; others sit 1px apart with no clear reason (14/15,
17/18/19, 23/24/25/26).

**Change.** Adopt the 19 named styles the extraction already identified
(`body`, `label`, `eyebrow`, `section-title` and so on) as tokens, and map
every `font-size` to one. Values that sit 1px from a token snap to it.

**Risk.** Low per change, but the changes are many and each is a visible 1px
shift. Worth doing alongside 3.2, not on its own.

### 3.4 A spacing scale — optional

There is no spacing scale today. Recurring values (90/60/40px section
padding, 25px card padding, 20px gaps, 8px/16px nav padding) are literals.
A small scale would help, but it is the lowest-value item here and the most
likely to cause small visual regressions. Do it only if 3.2 is going ahead
anyway, since both touch every component.

## Keep as is

These look like candidates for simplification but should stay:

- **The `md-state-layer` mixin.** Its rounded pseudo-element and host
  `isolation: isolate` work around real hit-testing and paint-order problems,
  and its comments document why. It is the best-reasoned code in the system.
- **Three modes.** `default` and `dark` are close, but they are a deliberate
  product choice, and pruning roles (2.1) removes most of the cost of
  keeping three.
- **The per-mode name gradients.** Each one was tuned against the other two.
- **The Calibre / SF Mono split.** It is the system's strongest visual signal.
- **Bootstrap, for now.** Only the grid, nav and utilities are imported (see
  `bootstrap-custom.scss`), and `.container` is overridden anyway, so it could
  be replaced by CSS grid. But it has already been trimmed once
  (`20260731-184800-css-bundle-trim.md`), and removing it touches every
  template. Revisit after Phase 3.

## Verification

For every phase:

- `npm test` and the Playwright e2e suite pass.
- The compiled CSS is diffed before and after the change
  (`npm run build`, then compare `dist/`). Phase 1 should show deletions only.
- For Phases 2 and 3, take screenshots of the home page and `/aardeyamz` in
  all three modes at 390, 768, 1440, 1600 and 2200px wide, before and after.
  Phase 2 should show no pixel difference; Phase 3 should show only the
  intended ones.
- Lighthouse (already in CI) shows no regression in accessibility or CLS.

## Related backlog

`docs/todo/code-review-optimization.md` (merged in #107) covers runtime
performance, bundle size and TypeScript refactoring. The two plans don't
overlap in their changes, but three of its items touch the same code as 2.3
(one source for the logo). Do each pair in one change rather than editing the
same component twice:

- **Its item 5, the scroll-driven logo rotation.** It proposes moving the nav
  logo's spin from a scroll listener to `animation-timeline: scroll()`. Do this
  in the same change as the recentred `<app-logo>`, so the new animation
  doesn't carry the 44-unit orbit forward.
- **Its item 17, the loading screen.** It asks for the outro timer to be
  cleared on destroy and for `prefers-reduced-motion` to be respected. 2.3
  rewrites the same component's template.
- **Its item 17, the floating logos.** `generateLogos()` picks colours with
  `Math.random()` during SSR, so the server and the client disagree. 2.3 makes
  the field's colours depend on the mode. Settle both in one pass over how the
  field chooses its logos.

## Decisions for the reviewer

1. **1.1** — `$White` on the name card: switch to `$OnSurface`, or add a role?
2. **2.1** — prune the unused M3 roles (recommended), or keep the full set
   and document why?
3. **2.2** — runtime lookup, or a generated tokens file (recommended)?
4. **3.1** — accept the browner light-mode accent needed to reach 4.5:1?
5. **3.2** — go ahead with the rem-based scaling, and if so, as one PR or one
   component per PR?
6. **Order** — merge PR #73's logo crop before 2.3, or fold it into the new
   component?
