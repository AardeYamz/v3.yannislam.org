Date: 2026-11-22 22:53:08

# README refresh

The README is now an overview: what the site is, two diagrams, a table of related repos and the commands to start. The previous full README (stack, routes, code structure, build hooks, testing, CI/CD, DNS, dependency security) moved unchanged to `docs/reference.md` (since folded back into the README; see the last section), with its relative links adjusted. `CLAUDE.md` now points to the reference for those details.

## Fixed: related repos and small inaccuracies

Checked against the code: the related-repos table dropped `workflows` (nothing in this repo calls it yet; the mermaid-lint workflow is still in PR #166) and `v3.yannislam.org-gatsby` (no such repo), and now says the remaining three are private. The README also gains a "where it lives" line of file paths, `npm run test:scripts`, the Release step in the CI diagram, and "Cloudflare DNS" in place of "DNS + Email" on the visitor path. In `docs/reference.md` the Playwright badge now matches the installed 1.65.

## Fixed: README back to a middle length

The 82-line overview cut too much for day-to-day work, so the README now keeps
the overview and adds back, in condensed form, the sections from the full
text: Getting started (with the pre-hooks), Stack, Architecture (component and
theme diagram), Routes, Code structure, Editing content, Testing (unit, e2e,
performance), CI/CD and deployment (CI/CD diagram, then DNS and delivery
diagram), Dependency security and Further documentation, plus the full badge
set. The longer sections link to their counterparts in `docs/reference.md`, which stays
the full text. `CLAUDE.md`, `AGENTS.md` and `CONTRIBUTING.md` now say to update
both files when commands, architecture or conventions change, and
`docs/README.md` lists the reference.

Checked against the code, these were stale in the original README and are
fixed in both files:

- `ContactComponent` is not mounted on the home page (its copy is still in
  `config.json` and unit-tested), so it is out of the diagram's home sections.
  The banner's `LogoLoopComponent` is added, and `ThemeService` no longer
  points at `AppComponent`, which does not inject it.
- `ScrollService` and `SeoService` were missing from the services, and
  `fetch-theme.js`, the `scripts/*.test.js` tests (`npm run test:scripts`),
  `logo-loop` and `variables.scss` from the code structure.
- The `config.json` table lacked the `ui` block, and `about.experiences.education`
  is a plain array inside `experiences`, not a top-level key.
- The Build & Test job table lacked `build-warnings-comment`, and the DNS
  table lacked the `v3.yannislam.org` PR-preview host. The related-repos row
  for personal-dns now says `v3` where it said `prs` (previews moved off
  `prs.yannislam.org`).

## Fixed: one README, no reference doc

Keeping two copies of the same facts meant two places to update, and they had
already drifted: `main` changed the workflows table in the old README while it
lived only in `docs/reference.md` here, which is what made this branch conflict.
`docs/reference.md` is gone and its full content is back in `README.md`, inside
the new layout (overview, lineage, related repos and the corrections above all
stay). `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` and `docs/README.md` point
at the README alone again.

Merged with `main`, so the README also carries its workflow changes: the
*shared template* callers of `AardeYamz/workflows` (Security, Merge main into
PRs, Dependabot auto-merge, dependency review), the split PR previews build and
deploy workflows, Diagram lint, and Workflow syntax lint (actionlint), which
was missing from `main`'s table. `workflows` is back in Related repos, since
those callers now use it. The build hooks list now includes `fetch-theme.js`
and says both pre-hooks also run before `test:e2e`.

After `main` dropped `@angular/animations` (#237), the code structure loses
`src/app/animations/`, `directives/` lists `fade-stagger`, and the stack names
`FadeStaggerDirective`.
