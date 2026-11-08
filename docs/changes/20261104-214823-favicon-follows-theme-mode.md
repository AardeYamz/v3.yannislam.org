Date: 2026-11-04 21:48:23

# The Favicon Follows The Theme Mode

Toggling the theme now changes the favicon with it: the clearcolor mark in the default mode, black in the light mode
and white in the dark mode, the same mapping as `ThemeService.logoVariant`.

- yl-theme now publishes `favicon-black.{svg,ico}` and `favicon-white.{svg,ico}` next to `favicon.{svg,ico}`
  (AardeYamz/yl-theme#20). `scripts/fetch-theme.js` fetches them into `src/generated/favicons/`.
- `ThemeService.applyToDom` rewrites the `href` of both `link[rel="icon"]` elements (SVG and ICO) whenever the mode
  changes, including on first load from a stored choice.
- `ngsw-config.json` prefetches the new files; `e2e/assets.spec.ts` checks they are served.
