# Switch to Material Design's default typefaces (Roboto / Roboto Mono)

## Context

Follow-up to the MD3 color/shape/elevation/state-layer restructure (see
`documentation/material-design-3-tokens.md`): the site was still on Calibre
(body/UI) and SF Mono (the code-styled accents — nav numbers, section
eyebrows, skill tags), both self-hosted under `src/assets/fonts/`. Ask was
to also switch the typefaces themselves to Material's, which is Roboto for
UI/body text and Roboto Mono for monospace/code-styled text.

## Self-hosted, not a Google Fonts CDN link

The site already self-hosts every font it uses (no `<link>` to
`fonts.googleapis.com` in `index.html`) — keeping that pattern avoids adding
a new third-party runtime request and keeps `font-display: swap` behavior
identical to how Calibre/SF Mono already worked. Fetched the actual woff2
files from `fonts.gstatic.com` (Apache-licensed, redistribution is fine) and
committed them the same way Calibre/SF Mono were.

## One variable-font file per style, not one static file per weight

The old setup had a separate static `.woff2`/`.woff`/`.ttf` trio for each of
Calibre's 4 weights × 2 styles (300/400/500/600, normal/italic) — 24 files,
~900KB, just for Calibre, and another 24/~1.7MB for SF Mono.

Current-day Google Fonts serves both Roboto and Roboto Mono as **variable
fonts**: requesting the `css2` API for several discrete weights in the same
style returned the identical file URL for every one of them. Confirmed with
`fontTools` (`pip install fonttools`) that the returned files carry an
`fvar` table with a continuous `wght` axis — Roboto spans 100–900, Roboto
Mono spans 100–700 — rather than being separate static instances. So instead
of one file per weight, it's one file per *style*:

| File | Covers |
| --- | --- |
| `src/assets/fonts/Roboto/Roboto-Variable.woff2` | weight 100–900, normal |
| `src/assets/fonts/Roboto/Roboto-Italic-Variable.woff2` | weight 100–900, italic |
| `src/assets/fonts/RobotoMono/RobotoMono-Variable.woff2` | weight 100–700, normal |
| `src/assets/fonts/RobotoMono/RobotoMono-Italic-Variable.woff2` | weight 100–700, italic |

4 files, ~155KB total combined — smaller than either of the two font
families it replaced individually. `fonts.scss` declares each with a
`font-weight: 100 900` (or `100 700`) *range* rather than a single number,
which is what tells the browser "pick any weight in this span out of the
variable font" instead of treating it as one fixed-weight face — the same
mechanism that let a single Calibre-Medium.woff2 only ever serve weight 500
now lets one file serve the exact weight requested (300/400/500/600, per
`$MainFont`'s existing usage across the site) via the font's own weight
axis, rather than snapping to the nearest of a few baked-in static
instances.

No `.woff`/`.ttf` fallback was added (unlike the old Calibre/SF Mono
`@font-face` rules, which shipped all three formats): variable-font support
and woff2 support both landed in evergreen browsers around the same time
(2018 vs. 2016), so there's no realistic browser that can load a woff2 but
not resolve a variable font's weight axis — a `.woff` fallback would be
dead weight for this specific pairing.

## Changes

- `src/fonts.scss` — replaced all 16 Calibre/SF Mono `@font-face` rules with
  4 Roboto/Roboto Mono ones (above).
- `src/variables.scss` — `$MainFont`/`$CodeFont` now lead with `Roboto` /
  `Roboto Mono` instead of `Calibre` / `SF Mono`; the rest of each fallback
  stack (system sans-serif / system monospace) is unchanged.
- `src/assets/fonts/Calibre/`, `src/assets/fonts/SFMono/` — deleted,
  including their bundled (and already-unused — nothing in `src`
  referenced them) vendor `stylesheet.css` files.
- `src/assets/fonts/Roboto/`, `src/assets/fonts/RobotoMono/` — new.

No component `.scss` changes needed: every component already reaches the
font through `$MainFont`/`$CodeFont`, not a hardcoded family name.

## Verification

- `ng build` (production) — passes; same two pre-existing component-style
  budget *warnings* as before this change (`header.component.scss`,
  `workhistory.component.scss`), nothing new.
- Confirmed the built output's `assets/fonts/Roboto/` and
  `assets/fonts/RobotoMono/` contain the 4 expected files, and that Angular
  also content-hashes copies of them into `dist/.../media/` (i.e. they're
  correctly picked up as referenced build assets, not just static files
  along for the ride).
- `ng serve` + a headless-Chromium (Playwright) pass: checked
  `document.fonts` after load — `Roboto 100 900 normal`, `Roboto 100 900
  italic`, and `Roboto Mono 100 700 normal` all reported `status: "loaded"`
  (the italic Roboto Mono face wasn't triggered by anything on the loaded
  page, so it stayed `unloaded`, as expected for on-demand font loading).
  Screenshotted the banner section and visually confirmed the heading/body
  text renders in Roboto and the code-styled nav numbers/eyebrow text
  render in Roboto Mono.
