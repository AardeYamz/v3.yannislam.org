Date: 2026-11-01 03:37:36

# Take The Logos From The Shared Theme

The eleven logo SVGs (`src/assets/images/logos/*.svg`) were copies of artwork
that also lives in the loaders and in other sites. They are now generated in the
`yl-theme` project from one template (`logos/logo.svg.tmpl`) and a palette
(`logos/variants.json`), published with every theme version as
`logo-<variant>.svg`, and fetched here like the design tokens.

## What changed

- **`theme.json`** pins `v2026-11-01-0333` and the SHA-256 of `yl-tokens.css`
  and of each of the eleven logos.
- **`scripts/fetch-theme.js`** fetches every file in the pin, hash-checks it, and
  writes `src/generated/yl-tokens.css` and `src/generated/logos/<variant>.svg`
  (git-ignored). `--bump` pins the newest version with all of those files. The
  tests cover the logo paths, a tampered logo and a missing one.
- **`angular.json`** serves `src/generated/logos` at `assets/images/logos/` for
  the build and the unit tests, so the header, the falling logos and the web
  manifest use the same URLs as before. No component changed.
- The eleven SVGs are removed from `src/assets/images/logos/`. They are
  byte-identical to what the theme generates (the original geometry and the
  same centred crop).
- `config.json`'s unused `manifestIcon` now names the served path.

## Notes

- A build now needs `theme.yannislam.org` for the logos too, the first time
  (they are cached in `src/generated/`).
- The loading screen's polygons and the banner mark keep their inline geometry
  (it is code, not an asset); both match the theme's logo.
