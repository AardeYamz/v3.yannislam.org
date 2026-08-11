Date: 2026-08-11 12:43:23

# Dependabot Configuration And Aikido Integration

Before this change the repository had dependency security half-wired: GitHub's
alerts-driven Dependabot **security** updates were switched on in the
repository settings (PR #54, "Bump the npm_and_yarn group across 1 directory
with 11 updates", came from them), but there was no `.github/dependabot.yml`
at all — so no scheduled *version* updates, no grouping policy, no ecosystem
coverage for the workflow files, and nothing scanning whether any of those
advisories actually reached shipped code.

This adds both halves:

- `.github/dependabot.yml` — what opens the bump PRs, and how they're batched.
- `.github/workflows/security.yml` — an Aikido scan that triages them.

## Why both

Dependabot and Aikido are not alternatives here; they do different jobs.

Dependabot is a bump machine. It reads the advisory database, matches it
against the lockfile, and opens a PR. It has no idea whether the vulnerable
code path is reachable from this app — a critical CVE in a transitive
dependency of Karma is treated exactly like one in `@angular/core`. On a
static portfolio site, most of what it finds is the former.

Aikido scans the repo and answers the reachability question. That's the piece
that keeps the PR queue meaningful instead of a wall of criticals nobody can
triage. So: Dependabot opens, Aikido decides whether it's a blocker.

## The npm ecosystem config

Weekly, Mondays 06:00 UTC, capped at 5 open PRs.

**Grouping.** Four groups, matched in file order (a dependency lands in the
first group whose patterns *and* update-types both match):

| Group | Covers | Why |
|---|---|---|
| `angular` | `@angular/*`, `@angular-devkit/*`, `@ng-bootstrap/ng-bootstrap`, `ngx-owl-carousel-o`, `ngx-typed-js` | The Angular packages have to move in lockstep. A PR that bumps `@angular/core` while `@angular/compiler` stays put leaves the workspace with mismatched versions that don't build. |
| `testing` | Playwright, Karma, Jasmine, `@types/jasmine`, `istanbul-lib-instrument`, `http-server` | Churns constantly, never ships in the bundle. Batching costs nothing. |
| `minor-and-patch` | `*` | Everything else non-major, in one PR. |
| `security-updates` | `*`, `applies-to: security-updates` | Pins the current batching of alerts-driven PRs so it survives a change to the platform default. |

Note the first three carry `update-types: [minor, patch]`. That's deliberate —
it leaves **majors ungrouped**, so each major arrives as its own PR and can be
reverted on its own. A major buried in a ten-package batch is a bisect
problem.

**Ignores.** Four majors are ignored outright:

- `@angular/*` and `@angular-devkit/*` — Angular majors are done by hand, one
  major at a time, through `ng update` and its migration schematics. See
  `20260727-205542-UPGRADE-NOTES.md`: the 19 → 22 upgrade converted every
  template to the new control-flow syntax, added
  `ChangeDetectionStrategy.Eager` across all components, and adjusted tsconfig
  diagnostics — none of which a Dependabot version bump performs. A
  Dependabot PR here wouldn't just be noisy, it'd be wrong.
- `@ng-bootstrap/ng-bootstrap`, `ngx-owl-carousel-o`, `ngx-typed-js` — their
  majors trail the Angular major they're built against, so they can only move
  as part of that manual upgrade.
- `typescript` — majors *and* minors. The supported range is dictated by the
  Angular compiler, not by what's latest on npm; `~6.0.3` in `package.json`
  is intentional, not stale.

## The github-actions ecosystem config

Weekly, same window, capped at 3 PRs, everything in one group.

This one has a concrete motivating symptom. The workflows pin actions down to
the patch — `actions/checkout@v4.1.7`, `actions/setup-node@v4.0.3` — which is
good practice, but nothing was moving the pins. They'd drifted far enough that
every CI run now ends with:

```
Node.js 20 is deprecated. The following actions target Node.js 20 but are
being forced to run on Node.js 24: actions/cache@v4, actions/checkout@v4.1.7,
actions/setup-node@v4.0.3
```

Precise pins are only a security property if something keeps them current.
This is that something.

## The Aikido workflow

Runs on PRs to `main`/`master`/`develop`, on pushes to `main`, weekly at 06:30
UTC, and on `workflow_dispatch`. The weekly cron sits half an hour behind
Dependabot's 06:00 window so the scheduled scan sees whatever Dependabot just
opened.

Two design decisions worth recording:

**It skips itself, green, until activated.** The action needs an
`AIKIDO_SECRET_KEY`, and until someone installs the Aikido GitHub App and adds
that key, passing an empty credential would fail every PR in the repo. The
`secrets` context isn't available to a job-level `if:`, so the presence check
has to run *inside* a job and be handed forward as an output:

```yaml
  credentials:
    outputs:
      configured: ${{ steps.probe.outputs.configured }}
    steps:
      - id: probe
        env:
          AIKIDO_SECRET_KEY: ${{ secrets.AIKIDO_SECRET_KEY }}
        run: |
          if [ -n "$AIKIDO_SECRET_KEY" ]; then ...

  aikido:
    needs: credentials
    if: needs.credentials.outputs.configured == 'true'
```

Same guard covers fork PRs, which never get repository secrets.

**The key has to be added twice.** Dependabot PRs don't read from the Actions
secret store — GitHub gives them a separate one under *Settings → Secrets and
variables → Dependabot*. Add the key only to Actions and the scan silently
skips on every Dependabot PR, which is precisely the population it exists to
triage. Both locations are documented in the workflow header and the README.

Gating knobs, and why they're set where they are:

- `fail-on-dependency-scan: true`, `minimum-severity: CRITICAL` — the actual
  gate. Criticals block; everything below reports.
- `fail-on-timeout: false` — a scan that never came back is an infrastructure
  problem, not a finding. Dependabot alerts still cover the repo, so a flaky
  Aikido round-trip shouldn't red an unrelated PR.
- `fail-on-sast-scan` / `fail-on-iac-scan: false` — those gates are a paid
  Aikido tier. Left off so the job reports rather than hard-fails if the plan
  doesn't cover them.
- `post-scan-status-comment` / `post-sast-review-comments: 'off'`, and
  `permissions: contents: read` — the workflow doesn't need write access to
  the PR, so it doesn't ask for it. Worth knowing if comments are turned on
  later: Dependabot PRs get a read-only `GITHUB_TOKEN`, so the comment posting
  would fail there specifically.

## Open item, not fixed here

PR #54 (the grouped security update) is currently red, and not because of
anything in this change. Its `npm ci` fails with:

```
npm error `npm ci` can only install packages when your package.json and
package-lock.json ... are in sync.
npm error Missing: chokidar@5.0.0 from lock file
npm error Missing: readdirp@5.1.1 from lock file
```

Dependabot regenerated the lockfile for the 11-package group and dropped two
transitive entries. That's a defect in that PR's lockfile, not a repo
configuration problem — `@dependabot recreate` on the PR is the remedy. It's
called out here because it's the kind of failure that looks like the new
config caused it, and it predates it.
