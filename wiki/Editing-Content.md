# Editing Content

Nearly everything on the page comes from `src/assets/config.json`. Its shape is typed in `src/app/services/site-config/site-config.model.ts`, but nothing validates the JSON at build time: keep new entries in the same shape as their neighbours and update the model for any new field.

| Key | What it holds |
|---|---|
| `siteMenu` | Nav items: `navTitle`, `siteLocation` (route or `/#anchor`), optional `navNumber` / `navContent` / `scrollSection` |
| `logos` | Map of `{ src, alt }`, referenced by `logoKey` from work, education and volunteering entries. With no `logoKey` or an empty `src`, a placeholder logo is drawn from the organization's name |
| `logoAbout` | Map of `logoKey` to an "about" blurb, shared by every entry with that `logoKey` that has no `about` of its own (e.g. the three Voya roles) |
| `about` | `first` / `last` name, `email`, the `contact` list (each with an `icon` key such as `fa-linkedin` from the icon registry, and a `link`), and the `aardeyamz` name-meaning cards |
| `about.experiences` | `work` and `volunteering`, each a `list` of `organization`, `title`, `timeframe`, `description[]`, `skills[]` (optional `logoKey`, `link`, `about`, `tab`); `education`, a plain array of entries of the same shape; a flat `skills` summary |
| `banner` | `greeting`, `name`, `blurb`, and the `typeSection` strings the typewriter cycles through |
| `footer` | Repo link, "built with" credit, `designCredits` |
| `projects.college`, `projects.highschool` | Each a `list` of `{ imgs[], title, timeframe, description[], link? }` |
| `ui` | Interface text the templates use, grouped by component (`header`, `banner`, `about`, …): labels, buttons, headings, ARIA text. No user-visible text goes in a template |
| `siteTitle`, `heading`, `subHeading`, `manifest*` | `<title>` and PWA manifest fields |

Image `src` values can be a URL or a path under `src/assets/`. A new social icon must exist in `src/app/icons/icon-registry.ts`. The dev server picks up edits on save.

To update the résumé, drop a new `<name> YYYYMMDD.pdf` in `src/assets/resume/` and commit it with the regenerated `resume-manifest.json`.
