Date: 2026-10-31 17:03:04

# Take The Design Tokens From The Shared Theme

v3 used to own its colour, shape, elevation, state and motion tokens in
`src/theme.scss`. They now live in the `yl-theme` project, which publishes them
as `yl-tokens.css`, and v3 fetches them at build time like the other sites that
use the theme.

## What changed

- **`theme.json`** pins the theme version and the SHA-256 of `yl-tokens.css`.
- **`scripts/fetch-theme.js`** downloads that version from
  `https://theme.yannislam.org`, refuses a file whose hash differs, and writes
  `src/generated/yl-tokens.css` (git-ignored). The `prestart`, `prebuild`,
  `prewatch`, `pretest` and `pretest:e2e` hooks run it after the resume
  manifest. `node scripts/fetch-theme.js --bump` pins the newest version.
  `scripts/fetch-theme.test.js` covers fetch, cache hit, hash mismatch, stale
  file and HTTP error.
- **`angular.json`** loads `src/generated/yl-tokens.css` instead of
  `src/theme.scss` in the app and the test target. `src/theme.scss` is deleted;
  `variables.scss` keeps its `var(--md-sys-color-*)` aliases, which still
  resolve.
- **`ThemeService`** keeps its two literal colour tables. A new unit test checks,
  for each mode, that the `theme-color` meta tag and `accentColor()` equal the
  fetched `--color-navy` / `--color-orange`, so a theme bump that moves them
  fails the tests.
- The fonts are licensed and not published, so `fonts.scss` and the font files
  stay here.

## Why

One source for the palette across v3 and the project pages (trips, timeline,
37 Bestick Rd, the Dodge toolbox), versioned and hash-pinned, instead of a
copy that has to be kept equal by hand. Phase 3 of the yl-theme plan.

## Verified

- Compiled the old `theme.scss` with Sass and compared its 76 custom properties
  with those in the built `styles-*.css`, per selector and mode: no differences
  once number formatting is normalised (`0.07` vs `.07`).
- `npm test` (181 specs, including the new ones) and `npm run test:scripts`
  pass; `e2e/theme.spec.ts` passes; `npm run build` succeeds.
- Not run: the Lighthouse presets.

## Notes

- Builds, tests and `ng serve` now need network access the first time (or after
  a `theme.json` change) to reach theme.yannislam.org.
