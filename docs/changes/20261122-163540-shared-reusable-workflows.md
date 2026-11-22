Date: 2026-11-22 16:35:40

# Shared Reusable Workflows

Four workflows now call the reusable templates in
[personal-domain-devops](https://github.com/AardeYamz/personal-domain-devops)
instead of carrying their own logic (personal-domain-devops#34):

| Workflow | Template | Inputs |
|---|---|---|
| `security.yml` | `reusable-zizmor.yml` | |
| `sync-prs.yml` | `reusable-sync-prs.yml` | `dispatch-workflows: build-test.yml security.yml` |
| `dependabot-auto-merge.yml` | `reusable-dependabot-auto-merge.yml` | `required-workflow: Build & Test` |
| `diagram-lint.yml` (new) | `reusable-diagram-lint.yml` | `d2: true` |

Triggers, concurrency and permissions stay in the callers here, and the
templates are pinned by SHA.

## Behaviour changes

- **sync-prs** now takes the safer parts of the copy in `37-bestick-rd`. A
  PR that can't be fetched or pushed is a warning, and the loop goes on to the
  next PR (before, the whole run failed). A merge that would bring in a
  change to `.github/workflows/` is skipped with a warning, because
  `GITHUB_TOKEN` cannot push one.
- **Runner:** every job now runs on `vars.RUNNER` when it is set (before, they
  were hard-coded to `ubuntu-26.04`), so the self-hosted fallback covers them.
- **Check names** gain the caller job's prefix, e.g.
  `zizmor / Lint workflows (zizmor)`. Nothing here matches on check names,
  and `main` has no required checks.
- **Diagram lint** is new. It lints the README's mermaid diagrams and any
  `.d2` files.
