Date: 2026-08-12 00:22:33

# GitHub Actions Speed And Hardening

Implements Phases 1-3 (and the low-risk half of Phase 4) of
`docs/todo/github-actions-speed-and-hardening.md`, the plan written after
auditing measured step timings and raw job logs from run `31543012472`. That
document has the full reasoning, measured numbers, and rejected alternatives;
this is the changelog of what actually landed.

## Critical path (Phase 1)

**`playwright.config.ts`** — `workers: isCI ? 2 : undefined` → `4`. The
runner is 4-vCPU; two workers left half of it idle for the ~4 minutes the
test phase takes. `reducedMotion: 'reduce'` and `retries: 2` were already in
place, which is what made raising this safe rather than a flake gamble.

**`build-test.yml`, `e2e` job** — the Playwright browser cache had three
stacked bugs and has never actually worked:

- The install step ran unconditionally regardless of `cache-hit`, so
  `--with-deps` re-ran `apt-get install` for ~180 packages on every job even
  when the binaries were cached.
- The cache key was `hashFiles('package-lock.json')` with no shard
  discriminator, so the two matrix legs raced to write one key and both
  lost (`Failed to save: Unable to reserve cache...`).
- Every job installed all four browsers regardless of which ones the config
  would actually launch — Firefox and WebKit downloaded and never touched on
  PR runs, since `PLAYWRIGHT_FULL_MATRIX=0` only builds `chromium` and
  `mobile` (itself a `chromium` context).

Fixed by resolving the installed `@playwright/test` version into the cache
key, adding `matrix.shard` to the key so the two legs stop colliding, guarding
the install step on `cache-hit`, and introducing `PW_BROWSERS` — a job-level
env var mirroring the same push/schedule-vs-PR branch `playwright.config.ts`
already uses for its `fullMatrix` flag — so a cache hit only re-installs the
system deps (`playwright install-deps`) rather than the browsers themselves.
A comment ties `PW_BROWSERS` to the `fullMatrix` branch in
`playwright.config.ts` so the two don't drift apart silently.

## Token & supply-chain hardening (Phase 2)

- `build-test.yml` declared no `permissions:` block at all, so every job
  inherited the repository default (read/write on all scopes on repos
  created before GitHub changed that default) — including the `e2e` and
  `unit-tests` jobs, which run several hundred npm packages' worth of install
  scripts. Added `permissions: contents: read` at the workflow level.
- `codecov/codecov-action@v7.0.0` and `AikidoSec/github-actions-workflow@v1.0.13`
  were pinned to mutable tags. SHA-pinned both
  (`fb8b3582c8e4def4969c97caa2f19720cb33a72f` and
  `47d83dbcf3e6635044c4b31cef590c1e095217cc` respectively), version comment
  kept so Dependabot's `github-actions` ecosystem config keeps them current.
- `persist-credentials: false` added to all five `actions/checkout` steps
  (three in `build-test.yml`, one in `security.yml`; the `lighthouse` job
  already had it). No job in either workflow pushes, so there's no reason for
  the `GITHUB_TOKEN` to sit in `.git/config` where any install script could
  read it.
- `timeout-minutes` added to `unit-tests` (10), `build` (10), and the
  `credentials` probe job in `security.yml` (5) — `e2e` and `aikido` already
  had theirs. Nothing here should ever run 360 minutes; a hung browser or a
  wedged `npm ci` shouldn't be able to hold a runner for six hours.

## Closing the coverage gaps (Phase 3)

- **CodeQL** (`codeql.yml`, new file) — `javascript-typescript` analysis on
  PR and the existing weekly schedule slot. Report-only for now (findings
  land in the Security tab, nothing gates); the plan's own open decision 3
  recommends this until a clean baseline is established on an animation-heavy
  codebase CodeQL hasn't seen before.
- **`dependency-review-action`** (`build-test.yml`, new `dependency-review`
  job, `pull_request` only) — diffs the lockfile on every PR and fails at
  `high` severity, closing the window between "merged" and "advisory
  published" that Dependabot's reactive bumps leave open.
- **zizmor** (`security.yml`, new `zizmor` job) — lints the workflow files
  themselves for the exact class of bug the Phase 2 items above just fixed by
  hand (unpinned actions, credential persistence, overscoped tokens, cache
  poisoning, template injection), and uploads SARIF to the Security tab so
  regressions get caught automatically rather than at the next manual audit.

## Phase 4, the parts that didn't need a live run

- **§2.5** — the Codecov upload ran from both Node matrix legs with
  identical `flags`/`name`, double-counting the same coverage. Gated to
  `matrix.node-version == '22.x'`.
- **§2.7** — `cancel-in-progress: true` on both workflows' concurrency groups
  was also cancelling in-progress runs on pushes to `main`, which meant two
  merges close together left `main` without a green run of its own. Scoped
  to `${{ github.event_name == 'pull_request' }}`.

## What's deliberately not in this pass

- **§2.4** (`paths-ignore` for docs-only changes) — the plan flags this as
  the one item that can silently break required-status-check merging if the
  three jobs it skips are marked required on `main`, and this session has no
  way to read branch protection settings. Needs a manual check at
  Settings → Branches before it ships.
- **§2.3** (a third Playwright shard) — the plan is explicit that this should
  only be measured after §2.1/§2.2 land on a real run, not guessed at from a
  diff.
- **§2.6** (folding the `credentials` job into a step) — open decision 4 in
  the plan asks whether the current job-level reporting is deliberate; left
  alone pending that answer, consistent with the plan's own "fine to leave
  alone" framing.
- **§3.8** (Scorecard, harden-runner audit mode, `CODECOV_TOKEN`) — explicitly
  optional P2 items in the plan; not attempted here.
- Flipping the repo-wide **Settings → Actions → General → Workflow
  permissions** default to read-only, and verifying branch protection for
  §2.4 — both are account/repo-settings actions outside version control that
  this session can't reach; noted in the todo doc as still open.

See `docs/todo/github-actions-speed-and-hardening.md` §4 for the updated
phase checklist and the "still open" list carried forward from this pass.

## Fixed: dropped the custom CodeQL workflow — default setup already covers it

The first push of this branch (PR #62) added `.github/workflows/codeql.yml`
per §3.5 above. Both the `CodeQL` check and the downstream `Code scanning AI
findings on PR #62` check failed:

```
Code Scanning could not process the submitted SARIF file:
CodeQL analyses from advanced configurations cannot be processed when the
default setup is enabled
```

`github-advanced-security[bot]`'s comment on the PR confirmed why: this repo
already has GitHub's CodeQL **default setup** turned on at the repo level
(Settings → Code security → Code scanning). Default setup and a custom
("advanced configuration") workflow can't both analyze the same language —
GitHub rejects the custom one's SARIF outright rather than merging results.

Default setup already does everything §3.5 wanted — `javascript-typescript`
scanning on pushes, PRs, and a periodic schedule — for zero workflow-file
maintenance. So the fix is to delete `codeql.yml` rather than route around
the conflict (e.g. by disabling default setup to make room for the custom
file): the custom file added nothing default setup didn't already provide,
and removing it is strictly less to maintain. `Build & Test` and `Security`
(including zizmor and dependency-review, both new in this same push) passed
on the first run without changes.

**Not verified from this session:** whether default setup's actual trigger
configuration matches what §3.5 assumed (PR-triggered plus the existing
weekly cron slot) — that's a Settings page, not a file in this repo, so
confirm it there if the exact schedule matters.

## Fixed: zizmor's own blanket policy caught the `actions/*` pins it wasn't asked to check

Once zizmor (added in this same push) actually ran, it failed the PR on its
own `unpinned-uses` audit — not on `codecov/*` or `AikidoSec/*` (already
SHA-pinned per §3.2 above), but on `actions/checkout@v7.0.1` inside zizmor's
*own* new job in `security.yml`. The plan had explicitly deprioritized
pinning first-party `actions/*` references ("lower urgency... do
`codecov/*` and `AikidoSec/*` first"), but zizmor's default policy doesn't
distinguish first-party from third-party — any mutable tag is an error.

Rather than suppress the rule, pinned everything it flagged: every
`actions/checkout`, `actions/setup-node`, `actions/cache`,
`actions/upload-artifact`, and `actions/download-artifact` reference in both
workflow files now resolves to a 40-character commit SHA with the version
kept as a trailing comment, same pattern as the two P0 pins. Dependabot's
`github-actions` ecosystem config already tracks and updates SHA pins in
place, so this doesn't add ongoing maintenance.

While fixing that, `zizmor --no-online-audits` (run locally against the
workflow files, `pip install zizmor`) also turned up two `low`-severity
`template-injection` findings: the new `PW_BROWSERS` job-level env var was
interpolated into `run:` steps via `${{ env.PW_BROWSERS }}`, which pastes the
value into the script text before the shell sees it. Switched both to plain
shell expansion (`$PW_BROWSERS`) instead — GitHub Actions already exports
`env:` entries as real environment variables for `run:` steps, so this loses
nothing and closes the finding at the source rather than suppressing it.
`zizmor --no-online-audits` reports clean after both fixes.
