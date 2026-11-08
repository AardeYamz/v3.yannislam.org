Date: 2026-11-04 05:00:00

# Move Template Text Into config.json

Preparation for a second-language edition (PR #178), with no visible change.
Text that was hard-coded in templates now lives in a new `ui` block of
`src/assets/config.json`, so a translation can supply its own copy.

## What changed

- **`config.json` `ui` block:** header aria-labels / alt text / theme-toggle
  labels, banner button labels, the About title, paragraphs (HTML) and image
  alt, the Education and Namecard titles, project buttons, work-history link
  labels, and the footer "Designed by" and email aria-label. Values are the
  strings that were in the templates, unchanged.
- **`UiStrings`** in `site-config.model.ts` types the block;
  `SiteConfigService.ui` exposes it. Components read their slice through a
  `ui` field.
- Placeholders `{mode}`, `{heading}`, `{title}` and `{handle}` are filled in
  by the template or component, since the order of words differs by language.
- Component specs that mock `SiteConfigService` now supply `ui`.
