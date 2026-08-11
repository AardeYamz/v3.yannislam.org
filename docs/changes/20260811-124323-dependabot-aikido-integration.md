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

---

Date: 2026-08-11 22:52:21

## Follow-up: what the first day of PRs actually taught us

The config above went in on the strength of one broken Dependabot PR (#54).
Within a day it had produced three more — #58 (`github-actions` group), #59
(`angular` group), and the recreated #54 — which is enough evidence to correct
one claim in this document and record two findings that cost real time.

### Correction: `@dependabot recreate` does not fix the lockfile defect

The "Open item" section above says the missing `chokidar`/`readdirp` entries in
#54 were "a defect in that PR's lockfile" and that `@dependabot recreate` is
the remedy. The first half is right; the second is wrong, and following it
would have wasted a cycle.

Dependabot rebased #59 onto a newer `main` on its own — effectively a recreate
— and regenerated the lockfile with the **identical** defect: the same four
nested `chokidar@5.0.0` / `readdirp@5.0.0` pairs deleted from under
`@angular-devkit/architect`, `@angular-devkit/schematics`, `@angular/cli`, and
`@schematics/angular`, with all four dependents left requiring them. This is
not a one-off corruption that a retry shakes out. It is reproducible behaviour
of whatever npm version Dependabot regenerates with, and it will recur on
every grouped npm PR that touches this dependency cluster.

**The remedy is to fix the lockfile on the branch**, not to ask for a new one:

```bash
rm -rf node_modules            # see "the node_modules trap" below
npm install --package-lock-only
```

Note that pushing to a Dependabot branch makes Dependabot stop managing it — it
won't rebase it afterwards, and a later `@dependabot recreate` discards the
fix. That's an acceptable trade here, since the alternative is a PR that can
never go green.

### Finding: the failure only reproduces under npm 10

This one is worth internalising, because it makes the bug look like a phantom.

`npm ci` on the broken lockfile **succeeds** under npm 11 and **fails** under
npm 10:

| Runtime | npm | `npm ci` on the broken lockfile |
|---|---|---|
| Node 24.x | 11.x | passes — tree judged valid |
| Node 22.x | 10.9.8 | `EUSAGE`, four `Missing:` pairs |

CI's `build` job pins Node 22.x, so that is the job that reports it. Anyone
reproducing locally on Node 24 will conclude there is nothing wrong.

The same split governs the fix, in both directions:

- Regenerating under **npm 11 does not repair it** — npm 11 considers the tree
  already valid, prints `up to date`, and writes nothing. Only npm 10 adds the
  missing entries back.
- Regenerating under **npm 10 removes 24 `"libc"` fields** from optional
  platform-specific packages, because npm 11 writes that metadata and npm 10
  does not. This looks alarming in the diff and is not a regression:
  `main`'s lockfile has never carried a single `"libc"` field, so npm 10 output
  is what matches the repository. It is npm 11's additions that are the
  anomaly.

So: **regenerate lockfiles with npm 10 for this repo**, matching what the
Node 22.x CI job runs. Node 22.x is also the version the `build` job uses for
the production bundle, so it is the version that actually gates merges.

### Finding: the `node_modules` trap when regenerating

`npm install --package-lock-only` will derive the tree from an existing
`node_modules` directory rather than from the registry. On the first attempt at
#59 this silently reverted **all ten** of #54's security bumps — `lodash` back
to 4.17.21, `ws` to 8.17.1, `follow-redirects` to 1.15.6, and so on — because
the installed tree predated that merge. It completed in under a second, which
is the tell; a real resolve against the registry takes tens of seconds.

Delete `node_modules` first, and diff the result against `main`'s lockfile
before pushing. A dependency PR that quietly un-does a security PR is the worst
possible outcome of "fixing" a lockfile, and nothing in the CI signal would
have caught it — every check would have gone green.

### The config itself is doing what it was designed to do

Worth recording, since the groups and ignores were written blind:

- **`github-actions` group** fired first (#58, "bump the actions group with 6
  updates") and cleared the stale pins that had been emitting the Node 20
  runtime deprecation warning on every run — the exact problem that ecosystem
  was added for.
- **`angular` group** fired as #59, batching all 14 Angular packages into one
  PR at 22.1.1/22.1.3. They moved together, which is the whole point: a split
  bump leaves the workspace unbuildable.
- **The ignores held.** TypeScript stayed at `~6.0.3` and
  `@ng-bootstrap/ng-bootstrap` at `^21.0.0` through an Angular minor bump,
  which is what keeps those two from drifting off the Angular compiler's
  supported range.
- **`chore(deps)` / `chore(actions)` prefixes** came through on the generated
  commits as configured.

### Aikido: confirmed skipping, still not activated

The self-skip path works exactly as designed on live PRs: `Check Aikido
credentials` succeeds and `Aikido scan` reports `skipped`, with no red check
anywhere. That is the intended state until someone installs the GitHub App and
adds `AIKIDO_SECRET_KEY`.

It is worth being clear that **this means no Aikido scanning is happening yet**.
The workflow is wiring, not coverage. Every dependency PR so far has been
triaged by hand. Until the key is added to *both* the Actions and Dependabot
secret stores, the triage half of "Dependabot opens, Aikido decides" does not
exist — which is precisely the gap this integration was meant to close.
