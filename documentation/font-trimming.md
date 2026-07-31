# Font asset trimming (woff2-only)

## Context

`src/assets/fonts` shipped `.ttf`, `.woff`, *and* `.woff2` copies of every
weight/style in both font families used on the site — Calibre (Light,
LightItalic, Medium, MediumItalic, Regular, RegularItalic, Semibold,
SemiboldItalic) and SFMono (Medium, MediumItalic, Regular, RegularItalic,
Semibold, SemiboldItalic). `.woff2` was already listed first in every
`src` list and every current-generation browser supports it (Safari added
support back in 2016), so the `.ttf`/`.woff` copies were never actually
served in practice — just dead weight sitting in the bundle and repo.

`src/assets/fonts` was **2.6 MB**; after removing everything but `.woff2`
it's **460 KB**, an 82% reduction.

## Changes

- Deleted all `.ttf` and `.woff` files under `src/assets/fonts/Calibre` and
  `src/assets/fonts/SFMono`, keeping only the `.woff2` file per weight/style
  (16 files remain: 8 Calibre + 6 SFMono `.woff2`, plus each folder's
  `stylesheet.css`).
- `src/assets/fonts/Calibre/stylesheet.css` and
  `src/assets/fonts/SFMono/stylesheet.css`: each `@font-face`'s `src` now
  lists only the `.woff2` `url()`/`format()` pair (the `.woff` fallback
  entry is gone). `font-display: swap` was already present on every rule in
  both files, so no change was needed there.
- `src/fonts.scss` (the copy Angular actually bundles — wired in via
  `angular.json`'s `styles` array — as opposed to the two `stylesheet.css`
  files above, which aren't referenced by the build): same trim, each
  `src` now reads
  ```scss
  src: local('Calibre'),
      url('assets/fonts/Calibre/Calibre-Medium.woff2') format('woff2');
  ```
  with the `.woff` `url()` line removed from all 14 `@font-face` blocks
  (8 Calibre + 6 SFMono). `font-display: swap` was likewise already present
  throughout.
- Repo-wide grep for `.ttf` and `.woff'` (excluding `.woff2`) after the
  edits returns nothing — no dangling references to a deleted file.

## Preload

The banner's name text (`<h2>Yannis Lam;</h2>` in
`src/app/components/home/banner/banner.component.html`) is the largest
above-the-fold element on the page — 80px, `font-weight: 600`,
`font-family: $MainFont` (Calibre) per `banner.component.scss` — and the
likely LCP (Largest Contentful Paint) candidate. The header nav, by
contrast, uses `$CodeFont` (SF Mono) at much smaller sizes (12–16px).

`src/index.html` now preloads that specific file in `<head>`:

```html
<link rel="preload" href="assets/fonts/Calibre/Calibre-Semibold.woff2" as="font" type="font/woff2" crossorigin>
```

`crossorigin` is required on font preloads even for same-origin requests,
per the Fetch spec's anonymous-mode CORS handling of `<link as="font">` —
omitting it causes the browser to fetch the resource twice (once for the
preload, once for the actual `@font-face` load).

## Files touched

- `src/assets/fonts/Calibre/*.ttf`, `*.woff` — deleted (16 files).
- `src/assets/fonts/SFMono/*.ttf`, `*.woff` — deleted (10 files).
- `src/assets/fonts/Calibre/stylesheet.css`, `src/assets/fonts/SFMono/stylesheet.css`
  — `src` trimmed to `.woff2` only.
- `src/fonts.scss` — `src` trimmed to `.woff2` only across all 14
  `@font-face` rules.
- `src/index.html` — `<link rel="preload">` added for
  `Calibre-Semibold.woff2`.

## Verification

- `npx ng build` — succeeds with no errors (one pre-existing, unrelated
  budget warning on `header.component.scss`, present before this change).
- Confirmed no `.ttf`/`.woff` files land in `dist/**/assets/fonts` after
  the build.
- Served the built `dist/v3.yannislam.org/browser` output and drove it
  with headless Chromium (Playwright): no failed/`>=400` responses for any
  font asset, `document.fonts` shows the Calibre/SF Mono weights loading
  successfully, and the computed style of the banner `<h2>` resolves to
  `font-family: Calibre, ...` / `font-weight: 600`, matching the preloaded
  file. Screenshotted the homepage to confirm the name and nav text still
  render in their correct typefaces (not a fallback font). The only
  network failures observed were unrelated third-party requests (Google
  Analytics, external profile/logo images on the volunteering/experience
  sections) blocked by the sandbox's outbound proxy — expected in this
  environment and unrelated to the font change.
