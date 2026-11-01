Date: 2026-10-30 04:28:00

# Consolidate The Documentation

The root `README.md` and `CLAUDE.md` both described the app as it was before
the standalone migration (`AppModule`, `HomeModule`, `app-routing.module.ts`,
Font Awesome, `ngx-typed-js`), and repeated each other. The loose files in
`docs/` had no index.

## What changed

- **`README.md`** rewritten against the current code: standalone bootstrap,
  all four routes plus the prerender list, inline SVG icons, the typewriter
  and link previews, Vercel Analytics, the `vercel-build-warnings` workflow,
  the Node 24/26 matrix and the full e2e spec list. Duplicated test commands
  merged, the `config.json` keys turned into a table, a contents list added.
- **`CLAUDE.md`** cut down to commands, a short map of the app, and the rules
  (content, SSR/zoneless, styling, build hooks, security headers, docs). It
  points to `README.md` for everything else. It no longer claims
  `resume-manifest.json` is gitignored (it is tracked; finding 2 of the second
  pass in `docs/todo/security-review.md`).
- **`docs/README.md`** (new) indexes the three folders and groups every
  `docs/changes/` write-up by area.
- **`docs/AGENT-TODO.md` → `docs/todo/README.md`**, rewritten as an ordered
  queue with each plan's status. The `remove-aikido-workflow` item was dropped
  (merged in #142); the new `security-review.md` was added.
- **`docs/pr-review/` → `docs/reviews/`**, and
  `docs/security-audit-2026-10-26.md` moved into it, so point-in-time reviews
  live in one place. References in other docs were updated, and relative links
  that pointed one level too shallow were fixed.

No code changed.
