Date: 2026-11-11 16:04:37

# Colours Go Through Roles Only

The shared theme (yl-theme) is condensing its colour tokens from 34 names to
12: ten Material 3 roles plus `--yl-color-emphasis` and
`--yl-color-name-gradient` (yl-theme `docs/proposal-condense-color-tokens.md`).
The palette layer (`--color-navy`, `--color-orange`…) and the roles no page
used are deprecated there and will be removed. This change moves v3 off every
name that is going away, ahead of the theme bump. Nothing changes on screen.

## What changed

- `src/variables.scss`: the nine palette aliases (`$Navy` … `$OrangeOpacity`)
  and the aliases of tokens the theme is dropping (`$PrimaryContainer`,
  `$OnSecondary`, `$SecondaryContainer`, `$Scrim`, the lowest / low / highest
  surface containers, `$ShapeNone`, `$ShapeExtraLarge`, `$Elevation0` / `4` /
  `5`) are deleted. New: `$Emphasis`.
- Footer and education: `$LightSlate` → `$Secondary`, `$Orange` → `$Primary`.
- Name card: `$White` → `$Emphasis`.
- Header: `$SecondaryContainer` → `$SurfaceContainerHigh`.
- `link-preview.scss`: six palette uses → roles (the border uses `$Outline`,
  the fills `$SurfaceContainer` / `$SurfaceContainerHigh`).
- Banner: the name's gradient reads `--yl-color-name-gradient`.
- `styles.scss` now sets `--color-card-overlay` itself (three modes, the same
  values). Only the work-history cards use it, so the theme is dropping it.
- `ThemeService`'s spec reads `--md-sys-color-surface` and
  `--md-sys-color-primary` to check `NAVY_BY_MODE` / `ORANGE_BY_MODE`.

## Works on the pinned theme and on the next one

`theme.json` is not bumped here: the condensed theme has no published version
yet. Every role used above already exists in the pinned version
(`v2026-11-09-1940`) with the same value, so the site builds and looks the same
today. The two names that only the new theme has carry a fallback to the old
name:

- `$Emphasis: var(--yl-color-emphasis, var(--color-white))`
- `var(--yl-color-name-gradient, var(--name-gradient))`

**Follow-up:** in the PR that bumps `theme.json` to the first version with the
condensed tokens, delete those two fallbacks.

## How it was checked

Three production builds were compared in headless Chromium: `main`, this
change on the pinned theme, and this change on the condensed theme's
`yl-tokens.css` (built from yl-theme PR #29). On `/`, `/projects`,
`/projects/highschool` and `/aardeyamz`, at 1440 and 390 px wide, in the
default, light and dark modes, the computed colour, background, border colours,
shadow, outline, fill, stroke, radius, text-fill and easing of every element
and its `::before` / `::after` were collected: about 25,000 element styles per
comparison, 0 differences in either. Unit tests: 197 pass. Not run: the
Playwright e2e suite and Lighthouse.
