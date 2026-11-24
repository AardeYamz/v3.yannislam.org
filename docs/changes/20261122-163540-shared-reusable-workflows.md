Date: 2026-11-22 16:35:40

# Shared Reusable Workflows

Four workflows now call the reusable templates in
the public [AardeYamz/workflows](https://github.com/AardeYamz/workflows) repo
instead of carrying their own logic (personal-domain-devops#34). The templates
are in a public repo because GitHub doesn't let a public repo like this one call
a private repo's workflows or actions.

| Workflow | Template | Inputs |
|---|---|---|
| `security.yml` | `zizmor.yml` | |
| `sync-prs.yml` | `sync-prs.yml` | `dispatch-workflows: build-test.yml security.yml` |
| `dependabot-auto-merge.yml` | `dependabot-auto-merge.yml` | `required-workflow: Build & Test` |
| `diagram-lint.yml` (new) | `diagram-lint.yml` | `d2: true` |

Triggers, concurrency and permissions stay in the callers here, and the
templates are pinned by SHA.

## Behaviour changes

- **sync-prs** now takes the safer parts of the copy in `37-bestick-rd`. A
  PR that can't be fetched or pushed is a warning, and the loop goes on to the
  next PR (before, the whole run failed). A merge that would bring in a
  change to `.github/workflows/` is skipped with a warning, because
  `GITHUB_TOKEN` cannot push one.
- **Runner:** the templates run on `vars.RUNNER` when it is set, else
  `ubuntu-26.04`. This repo sets no `RUNNER`, so nothing changes. Don't set
  it to a self-hosted runner: this repo is public, so a fork's PR could run code
  on that machine.
- **Check names** gain the caller job's prefix, e.g.
  `zizmor / Lint workflows (zizmor)`. Nothing here matches on check names,
  and `main` has no required checks.
- **Diagram lint** is new. It lints the README's mermaid diagrams and any
  `.d2` files.
