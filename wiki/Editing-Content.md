# Editing Content

Nearly everything on the page comes from `src/assets/config.json`. Its shape is typed in `src/app/services/site-config/site-config.model.ts`, but nothing validates the JSON at build time: keep new entries in the same shape as their neighbours and update the model for any new field.

| Key | What it holds |
|---|---|
| `siteMenu` | Nav items: `navTitle`, `siteLocation` (route or `/#anchor`), optional `navNumber` / `navContent` / `scrollSection` |
| `logos` | Map of `{ src, alt }`, referenced by `logoKey` from work, education and volunteering entries. Without a `logoKey` or with an empty `src`, a placeholder logo is drawn from the organisation's name |
| `logoAbout` | Map of `logoKey` to an "about" blurb shared by entries with no `about` of their own |
| `about` | `first` / `last` name, `email`, the `contact` list (each with an `icon` key such as `fa-linkedin` and a `link`), and the `aardeyamz` name-meaning cards |
| `about.experiences` | `work` and `volunteering` lists (`organization`, `title`, `timeframe`, `description[]`, `skills[]`, optional `logoKey`, `link`, `about`, `tab`); a top-level `education` array; a flat `skills` summary |
| `banner` | `greeting`, `name`, `blurb`, and the `typeSection` strings the typewriter cycles through |
| `footer` | Repo link, "built with" credit, `designCredits` |
| `projects.college`, `projects.highschool` | Each a `list` of `{ imgs[], title, timeframe, description[], link? }` |
| `siteTitle`, `heading`, `subHeading`, `manifest*` | `<title>` and PWA manifest fields |
| `ui` | User-visible UI strings (none belong in templates) |

Image `src` values can be a URL or a path under `src/assets/`. A new social icon must exist in `src/app/icons/icon-registry.ts`. The dev server picks up edits on save.

To update the résumé, edit `resume.md` in [yl-resume](https://github.com/AardeYamz/yl-resume). Its push to `main` publishes the PDF the site links to; nothing changes here.
