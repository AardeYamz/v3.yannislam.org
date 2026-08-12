# GitHub Actions: Speed & Hardening Plan

A plan for making CI faster and harder to abuse, written after auditing
`.github/workflows/build-test.yml`, `.github/workflows/security.yml`,
`.github/dependabot.yml`, `playwright.config.ts` and `karma.conf.js` against
the **measured step timings and raw job logs** of recent runs.

Every number below is from an actual run, not an estimate. The reference run
is [`31543012472`](https://github.com/AardeYamz/v3.yannislam.org/actions/runs/31543012472)
(push to `main`, 2026-08-11, full browser matrix, all green).

All recommended tooling is free for public repositories and, where a tool is
named, open source.

---

## 1. Where things stand today

### Measured wall clock

Run `31543012472` — **409s total (6m49s)**:

| Job | Duration | Starts at | On critical path? |
| --- | --- | --- | --- |
| `unit-tests (22.x)` | 39s | T+0 | no |
| `unit-tests (24.x)` | 42s | T+0 | no |
| `build` | 48s | T+0 | **yes** |
| `e2e (1)` | 356s | T+49 | **yes** |
| `e2e (2)` | 341s | T+49 | yes (shadowed by shard 1) |

The critical path is `build` → `e2e`, and it is **87% e2e**. Unit tests and
the Node matrix are already parallel and already cheap; they are not the
problem and should not be the focus.

A PR run ([`31542607564`](https://github.com/AardeYamz/v3.yannislam.org/actions/runs/31542607564))
is 257s (4m17s) — the same shape, with a two-project Playwright matrix instead
of four.

### Where the 356s in `e2e (1)` goes

| Step | Duration | Verdict |
| --- | --- | --- |
| Set up job + checkout + setup-node | 12s | fine |
| `npm ci` | 12s | fine (npm cache hits) |
| Cache Playwright browsers | 0s | **broken — see §2.1** |
| Install Playwright browsers | **75s** | **~100% waste — see §2.1** |
| Download dist artifact | 2s | fine |
| **Run Playwright tests** | **245s** | **half the machine is idle — see §2.2** |
| Upload report + post steps | 8s | fine |

Two problems account for 320 of the 356 seconds.

---

## 2. Speed findings

### 2.1 The Playwright browser cache has never worked — P0

Three independent bugs stack up in the same six lines of
`build-test.yml:134-142`:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v6
  id: pw-cache
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium firefox webkit
```

**Bug 1 — the install step has no cache guard.** There is no
`if: steps.pw-cache.outputs.cache-hit != 'true'`. The `id: pw-cache` output is
declared and then never read, so `npx playwright install --with-deps` runs
unconditionally on every job. Even on a cache hit, `--with-deps` still shells
out to `apt-get install` for ~180 packages (gstreamer, ffmpeg, the full font
set) — roughly 50-60s that a cache can never save.

**Bug 2 — the two shards race to write the same key and both lose.** From the
shard 1 log, post-job:

```
Failed to save: Unable to reserve cache with key
Linux-playwright-0445a182f0b1098b25a88bc632012081809de5b16867031beb2e1ddec89ff43b,
another job may be creating this cache.
```

Both matrix legs finish at roughly the same moment and try to reserve one key.
This is the classic `actions/cache` + matrix collision.

**Bug 3 — every browser is installed regardless of which ones will run.** The
log shows a full download on every single job:

| Download | Size |
| --- | --- |
| Chromium 151.0.7922.34 | 184.3 MiB |
| Chrome Headless Shell | 114.7 MiB |
| Firefox 153.0 | 108.2 MiB |
| WebKit 26.5 | 102.0 MiB |
| FFmpeg | 2.3 MiB |
| **Total** | **~511 MiB** |

On **pull requests** this is worse than it looks. `PLAYWRIGHT_FULL_MATRIX` is
`0`, so `playwright.config.ts` only builds `chromium` and `mobile` projects —
and `devices['Pixel 7']` is itself `chromium`. Firefox and WebKit are
downloaded on every PR and **never launched**. That is ~210 MiB and ~20s of
pure waste per shard, per PR.

**Fix.** Derive the browser list from the same signal the config uses, guard
the install on the cache hit, and key the cache on the Playwright version
rather than the whole lockfile so that an unrelated dependency bump does not
evict 500 MiB of browsers:

```yaml
- name: Resolve Playwright version
  id: pw
  run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"

- name: Cache Playwright browsers
  uses: actions/cache@v6
  id: pw-cache
  with:
    path: ~/.cache/ms-playwright
    # Shard is in the key so the two matrix legs never race for one
    # reservation (see the "Unable to reserve cache" failure this replaces).
    key: ${{ runner.os }}-playwright-${{ steps.pw.outputs.version }}-${{ env.PW_BROWSERS }}-${{ matrix.shard }}

- name: Install Playwright browsers
  if: steps.pw-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps ${{ env.PW_BROWSERS }}

# On a hit the binaries are restored but the apt packages are not; this is
# the cheap half of --with-deps and takes ~10s rather than ~60s.
- name: Install system dependencies
  if: steps.pw-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps ${{ env.PW_BROWSERS }}
```

with, at job level, alongside the existing `PLAYWRIGHT_FULL_MATRIX`:

```yaml
PW_BROWSERS: ${{ (github.event_name == 'push' || github.event_name == 'schedule') && 'chromium firefox webkit' || 'chromium' }}
```

> **Keep `PW_BROWSERS` and `playwright.config.ts` in sync.** They are two
> expressions of one decision. If the config's `fullMatrix` branch ever gains
> a browser, this env var has to gain it too or the run fails at launch. A
> comment on both sides pointing at the other is the minimum; deriving the
> list from `playwright.config.ts` is the better long-term fix.

**Expected: 75s → ~12s per shard.**

### 2.2 Playwright uses 2 workers on a 4-vCPU runner — P0

`playwright.config.ts:18`:

```ts
workers: isCI ? 2 : undefined,
```

The log confirms the cost:

```
Running 144 tests using 2 workers, shard 1 of 2
  22 skipped
  122 passed (4.1m)
```

`ubuntu-latest` is a 4-vCPU / 16 GB runner. Half of it sits idle for four
minutes. This is the single highest-leverage change in the whole plan and it
is a one-line diff.

Raise to `4` and measure. Browser tests are not perfectly CPU-parallel, so
expect roughly 245s → 130-150s rather than a clean halving. If flake appears,
`3` is the safe fallback — still a large win over 2.

Two things make this safer here than it would be in most repos:
`reducedMotion: 'reduce'` is already set (the config correctly identifies it
as the main flake lever on an animation-heavy site), and `retries: 2` already
absorbs a transient failure.

> **Watch the retry interaction.** `retries: 2` means a genuinely flaky test
> under higher concurrency costs 3× its runtime instead of surfacing as a
> failure. If wall clock gets *worse* after raising workers, the cause is
> retries firing, not the workers — check the report for retried specs before
> reverting.

### 2.3 Three shards instead of two — P1

Once §2.1 and §2.2 land, per-shard fixed overhead is ~35s and the test phase
is ~135s. A third shard splits the test phase to ~90s for ~35s of new
overhead, so it is still a net win — but it is the point where sharding stops
paying, and a fourth shard would not.

Do this **only after** §2.1 and §2.2 are measured, and drop it if the gain is
under ~30s. Requires updating both `matrix.shard` and the `--shard=N/2`
denominator.

### 2.4 Docs-only changes run the full 7-minute pipeline — P1

`docs/changes/` has 28 files and grows with nearly every piece of work in this
repo. A commit that only touches Markdown currently runs unit tests on two
Node versions, a production Angular build, and 144 browser tests across two
shards.

```yaml
on:
  pull_request:
    branches: [main, master, develop]
    paths-ignore:
      - 'docs/**'
      - '**/*.md'
      - 'LICENSE'
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '**/*.md'
      - 'LICENSE'
```

> **Check branch protection before merging this.** If `build`, `unit-tests` or
> `e2e` are required status checks, `paths-ignore` makes them *never report*
> on a docs-only PR rather than reporting success — which leaves the PR
> permanently unmergeable. The fix is either to not mark them required, or to
> add a tiny always-runs job that reports the check name. Verify this first;
> it is the one item here that can block merges if applied blindly.

This saves an entire ~7-minute run, not a slice of one.

### 2.5 Coverage is uploaded twice — P2

Both `unit-tests (22.x)` and `unit-tests (24.x)` upload to Codecov with
identical `flags: unittests` and `name: codecov-umbrella`. Same coverage,
counted twice, with no way to tell the reports apart. Gate the upload on the
primary version:

```yaml
- name: Upload coverage reports
  if: matrix.node-version == '22.x'
```

### 2.6 The `credentials` job burns a runner to test one string — P2

`security.yml:43-59` allocates a full `ubuntu-latest` VM — queue, boot,
checkout-less setup, teardown — to run `if [ -n "$AIKIDO_SECRET_KEY" ]`. The
comment explains *why* it is a job (`secrets` is not available to a job-level
`if:`), and that reasoning is correct, but the conclusion is not forced: the
same probe works as the first **step** of the `aikido` job, gating the
remaining steps with a step-level `if:`. That trades a whole runner
allocation (~20-30s wall clock) for zero.

The tradeoff is honest and worth stating: as a step, the skip shows up as a
green `aikido` job with skipped steps rather than a cleanly skipped job. If
the current job-level reporting is deliberate, this is fine to leave alone —
it is the lowest-value item on this list.

### 2.7 `cancel-in-progress` also cancels pushes to `main` — P2

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Correct and valuable for PRs. On `main`, two merges in quick succession mean
the first never finishes, so `main` has no green run of its own. Scope it:

```yaml
cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

### 2.8 Not worth doing

Recorded so these are not re-litigated later:

- **Caching `node_modules` instead of the npm download cache.** `npm ci` is
  already 12s with a warm npm cache. Saves ~8s/job and adds a correctness
  footgun (stale `node_modules` surviving a lockfile change).
- **Dropping the Node 24.x unit-test leg.** It is 42s, fully parallel, off the
  critical path, and it is the only forward-compatibility signal in the repo.
  Costs nothing that matters.
- **Self-hosted or larger runners.** Not free, and §2.1-2.3 recover more time
  than a bigger runner would.

---

## 3. Security findings

Framing: this is a public portfolio site, Vercel builds and deploys
independently, and no deployment secrets live in Actions. The realistic threat
is **supply chain** — a malicious `postinstall` in a transitive npm dependency,
or a compromised third-party action, reaching for the `GITHUB_TOKEN` and
pushing to `main`. The findings below are ordered by how much they help
against that.

### 3.1 `build-test.yml` declares no `permissions:` at all — P0

`security.yml` correctly sets `permissions: contents: read`. `build-test.yml`
sets nothing, so every job inherits the repository default — which for repos
created before GitHub changed the default is **read/write on all scopes**.

That token is present in the `e2e` and `unit-tests` jobs, which execute
several hundred npm packages' worth of install scripts and test code. Add at
the top of the workflow:

```yaml
permissions:
  contents: read
```

No job in this workflow writes to the repo, so nothing needs a broader grant.
This is the single highest-value security change here, and it is three lines.

> Worth also flipping the repo-wide default at **Settings → Actions → General
> → Workflow permissions** to "read repository contents". The per-workflow
> block is what actually protects these two files; the setting protects
> whatever gets added next.

### 3.2 Third-party actions are pinned to mutable tags — P0

```yaml
uses: codecov/codecov-action@v7.0.0
uses: AikidoSec/github-actions-workflow@v1.0.13
```

A git tag is a movable pointer. Anyone who can push to those repositories can
repoint `v7.0.0` at new code, and it lands in this pipeline on the next run
with no PR and no diff. Codecov's uploader was the subject of a real
supply-chain compromise in 2021, which makes it a poor candidate for a
mutable pin.

Pin third-party actions to a full 40-character commit SHA:

```yaml
- uses: codecov/codecov-action@<40-char-sha>  # v7.0.0
```

Dependabot already manages this repo's `github-actions` ecosystem
(`dependabot.yml:104-120`) and updates SHA pins in place, keeping the trailing
version comment accurate — so this costs nothing in ongoing maintenance.

`actions/*` is first-party GitHub and lower urgency; pin it too when
convenient, but do `codecov/*` and `AikidoSec/*` first.

### 3.3 `checkout` leaves the token in `.git/config` — P1

`actions/checkout` defaults to `persist-credentials: true`, writing the
`GITHUB_TOKEN` into `.git/config` as an `http.extraheader`. Every later step
in the job can read it — including `npm ci` lifecycle scripts. The shard 1
log shows the cleanup that confirms it was written:

```
Removing HTTP extra header
[command]/usr/bin/git config --local --name-only --get-regexp
  http\.https\:\/\/github\.com\/\.extraheader
```

No job in either workflow pushes, so this is free to turn off on all five
checkout steps:

```yaml
- uses: actions/checkout@v7.0.1
  with:
    persist-credentials: false
```

### 3.4 No `timeout-minutes` on three of five jobs — P1

`e2e` has `timeout-minutes: 20` and `aikido` has `10`. `unit-tests`, `build`
and `credentials` have none, so they inherit the 360-minute default. A hung
Karma browser or a wedged `npm ci` holds a runner for six hours. On a public
repo that is also a cheap denial-of-service against your own Actions
concurrency. Add `timeout-minutes: 10` to `unit-tests` and `build`, `5` to
`credentials` (or delete that job per §2.6).

### 3.5 There is no SAST — P1

`security.yml:82-83` deliberately disables Aikido's SAST and IaC gates because
they are a paid tier:

```yaml
fail-on-sast-scan: false
fail-on-iac-scan: false
```

That is a sound decision for a paid feature, but it leaves the repo with
**zero static analysis of its own source**. Aikido and Dependabot both look at
*dependencies*; nothing looks at `src/`.

**GitHub CodeQL is free for public repositories** and covers JavaScript and
TypeScript. It fills exactly this gap at no cost:

```yaml
- uses: github/codeql-action/init@<sha>   # v4
  with:
    languages: javascript-typescript
- uses: github/codeql-action/analyze@<sha>
```

Run it on PR and on the existing weekly schedule, not on every push. It is
slow (~3-5 min for a repo this size) but fully parallel with everything else,
so it does not touch the critical path.

### 3.6 No dependency review at PR time — P1

Dependabot is reactive: it opens a PR *after* an advisory is published for
something already merged. `actions/dependency-review-action` is proactive and
**free for public repos** — it diffs the lockfile on a PR and fails if the
change introduces a known-vulnerable or disallowed-license package, before it
lands.

```yaml
- uses: actions/dependency-review-action@<sha>
  with:
    fail-on-severity: high
```

This is the natural complement to the Dependabot + Aikido pair already in
place, and it closes the window between "merged" and "advisory published".

### 3.7 Nothing lints the workflows themselves — P1

Findings 3.1 through 3.4 are all mechanically detectable.
[**zizmor**](https://github.com/zizmorcore/zizmor) is an open-source
(Trail of Bits-affiliated) static analyzer for GitHub Actions with 38 audit
rules covering template injection, credential persistence, overscoped tokens,
unpinned actions, cache poisoning and impostor commits. It emits SARIF
straight into the GitHub Security tab.

Adding it means this class of regression gets caught automatically rather than
during the next manual audit:

```yaml
- uses: zizmorcore/zizmor-action@<sha>
```

Highest ratio of ongoing value to one-time effort on this list.

### 3.8 Optional additions — P2

- **[OpenSSF Scorecard](https://github.com/ossf/scorecard-action)** — free for
  public repos, open source, publishes a supply-chain posture score and SARIF.
  Largely a scoreboard for work items 3.1-3.3, useful for tracking that they
  stay fixed.
- **[step-security/harden-runner](https://github.com/step-security/harden-runner)**
  in `audit` mode — free Community tier for public repos. Records every
  outbound network call from the runner, which is the one control that would
  actually *catch* a malicious npm `postinstall` exfiltrating during `npm ci`.
  Start in `audit`, review a week of real egress, then move to `block` with an
  allowlist. Note this is a free tier of a commercial product, not fully open
  source — worth knowing given the free/OSS preference.
- **`CODECOV_TOKEN`** — tokenless upload from public repos is rate-limited and
  historically spoofable by third parties. Low severity here because
  `fail_ci_if_error: false` means a bad upload cannot redden a PR, but adding
  the secret is a two-minute fix.

---

## 4. Phased plan

Ordered so that the largest wins land first and nothing depends on a later
phase.

### Phase 1 — critical path (target: 409s → ~230s)

- [x] **§2.2** `workers: isCI ? 4 : undefined` in `playwright.config.ts`. Measure. Fall back to `3` on flake.
- [x] **§2.1** Rewrite the Playwright cache block: version-keyed, shard-suffixed, `cache-hit` guarded, `PW_BROWSERS`-scoped. Add the sync comment tying `PW_BROWSERS` to `playwright.config.ts`.
- [ ] Confirm from the run log that the browser download block is **absent** on the second run and that no `Failed to save` line appears. *(Needs a real CI run to verify — not observable from a diff.)*

### Phase 2 — token & supply-chain hardening (low risk, no behavior change)

- [x] **§3.1** `permissions: contents: read` at the top of `build-test.yml`. *(Flipping the repo-wide default at Settings → Actions → General is a manual step outside version control — still open, see below.)*
- [x] **§3.2** SHA-pin `codecov/codecov-action` and `AikidoSec/github-actions-workflow`, version comment retained. **Extended beyond the plan's original scope**: zizmor's default policy (added in §3.7) flags *every* unpinned `uses:`, `actions/*` included, as an error — not just the two P0 third-party actions. All `actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact`, and `actions/download-artifact` references in both workflows are now SHA-pinned too.
- [x] **§3.3** `persist-credentials: false` on all five checkout steps.
- [x] **§3.4** `timeout-minutes` on `unit-tests`, `build`, `credentials`.

### Phase 3 — close the coverage gaps

- [x] **§3.7** Add zizmor (`security.yml`, SARIF to the Security tab).
- [x] **§3.6** Add `dependency-review-action` to the PR path (`build-test.yml`, gated on `pull_request`).
- [x] **§3.5** CodeQL coverage — **not** via a custom workflow: this repo already has GitHub's CodeQL *default setup* enabled at the repo level, and a custom `codeql.yml` conflicts with it ("CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled" — confirmed on PR #62). Default setup already covers `javascript-typescript` on PR/push/schedule for free, so the fix was to *not* add a workflow file, not to work around the conflict. Verify at Settings → Code security → Code scanning that default setup's language/trigger config matches what this section wanted (PR-triggered, weekly cron) before considering this fully closed.

### Phase 4 — the remaining slices

- [ ] **§2.4** `paths-ignore` for `docs/**` and `**/*.md` — *deferred: still needs the branch-protection check called out below before it's safe to land.*
- [ ] **§2.3** Third shard — deferred until Phase 1 is measured on a real run; do this only if it still nets ~30s+ after §2.1/§2.2 land.
- [x] **§2.5** Gate the Codecov upload to `22.x`.
- [x] **§2.7** Scope `cancel-in-progress` to pull requests (both workflows).
- [ ] **§2.6** Fold the `credentials` job into a step — left alone; open decision 4 below.
- [ ] **§3.8** Scorecard, harden-runner in audit mode, `CODECOV_TOKEN` — optional P2, not yet done.

**Still open before Phase 4 can fully close:**

1. Whether `build` / `unit-tests` / `e2e` are required status checks on `main` — this repo's session has no branch-protection read access, so it couldn't be verified here. Check Settings → Branches before adding `paths-ignore`; if any of the three are required, add an always-runs shim job first (see §2.4).
2. The repo-wide Settings → Actions → General → Workflow permissions default hasn't been flipped to read-only — that's an account-level setting this session can't reach from the repo.
3. `workers: 4` (§2.2) and the CodeQL report-vs-gate question (§3.5) are both explicitly empirical/staged decisions in the original plan; nothing above forces a resolution before the next real CI run reports back.

---

## 5. Expected outcome

Projected against the measured run, applying Phases 1 and 4:

| | Now | After |
| --- | --- | --- |
| `build` | 48s | 48s |
| `e2e` fixed overhead | 111s | ~36s |
| `e2e` test phase | 245s | ~90-135s |
| **Total (push to `main`)** | **409s** | **~215-230s** |
| **Docs-only change** | **409s** | **0s** |

Roughly **45% off the critical path**, with the docs-only case — which is a
large share of this repo's commits — dropping to nothing.

Nothing in Phase 1 changes what is tested. The browser matrix, the 144 specs,
the coverage thresholds and the weekly `@external` run are all untouched; the
gain is entirely from not re-downloading half a gigabyte of browsers on every
job and from using the whole runner.

## 6. Performance testing (shipped — Lighthouse CI)

A `lighthouse` job now runs on every PR and push, in parallel with `e2e` off
the **same `dist` artifact**, so it rebuilds nothing and adds nothing to the
critical path (e2e is ~6 min; this is ~4 min). Config lives in
`lighthouserc.js`; `@lhci/cli` is a pinned devDependency rather than a floating
`npx --yes` fetch, and no new third-party action was introduced — both
deliberate, given §3.2.

### 6.1 Why it runs both mobile and desktop

This is the finding that shaped the whole job. Measured on the same commit,
same bundle, same machine:

| | Desktop preset | Mobile preset (default) | Field (Vercel, real users) |
| --- | --- | --- | --- |
| Performance | **93** | **48** | RES 37 |
| FCP | 1.0 s | 5.7 s | 3.17 s |
| LCP | 1.3 s | 6.2 s | 3.62 s |
| CLS | **0.022** | **0.181** | **0.68** |
| TBT | 60 ms | 330 ms | — |
| TTFB | ~0 ms | ~0 ms | 1.68 s |

A desktop-only run on localhost scores **93 and reports the site as healthy**,
while `docs/todo/desktop-performance.md` documents real users seeing a 37 with
CLS 0.68. Mobile throttling (slow 4G + 4× CPU slowdown, which is Lighthouse's
*default* — `preset: 'desktop'` is what opts out) is the only one of the two
that reproduces the layout shift at all.

So: **mobile is the sensitive regression detector, desktop is the one that
matches the metric currently being tracked.** Both run, in parallel, matrixed.

### 6.2 What this can and cannot tell you

It runs against the prerendered static bundle over localhost — genuinely the
same bytes Vercel serves, since `vercel.json` points `outputDirectory` at
`dist/v3.yannislam.org/browser` and all four routes are prerendered
(`app.routes.server.ts`). But there is no network in between.

**It will catch:** bundle-size growth, new render-blocking resources,
accessibility and SEO regressions, layout shift under throttling.

**It will never catch:** the 1.68 s TTFB. That reads ~0 ms on localhost and is
a Vercel/CDN/cold-start property. Nothing in CI substitutes for the field data.
Do not close out `desktop-performance.md` on the strength of a green
Lighthouse job.

### 6.3 Measured baseline (the numbers the budgets come from)

**Corrected after the first real PR run — see the callout below before
trusting any number in this section.**

Per-route, desktop preset, transferred bytes, as measured on the actual
GitHub runner (run `31545739099`, job `93957869367`):

| Route | Best Practices | Script | CSS | Font | Total |
| --- | --- | --- | --- | --- | --- |
| `/` | **0.74** | 793,942–793,945 | 209,307 | 375,344 | **6,970,080–6,970,654** |
| `/projects/` | 0.90 | 715,695–715,739 | 209,307 | 375,344 | 2,185,126 |
| `/projects/highschool/` | 0.90 | 715,252 | 209,307 | 375,344 | 2,357,363 |
| `/aardeyamz/` | 0.90 | 720,976–720,981 | 209,307 | 373,696 | 1,271,815 |

Mobile preset (job `93957869440`) matched within a few hundred bytes on
every number — expected, since network throttling changes timing, not bytes
transferred — which confirms these are stable, not run-to-run noise.

> **Why this table doesn't match what was here originally.** The first
> version of this section was measured in the sandbox that did this
> repo audit, and it was wrong in a way that only showed up once real CI ran
> it. That sandbox's egress policy blocks third-party hosts by design —
> confirmed directly: `googletagmanager.com`, `va.vercel-scripts.com`, and
> `vitals.vercel-insights.com` all returned `403` on `CONNECT`. Two things in
> this codebase depend on exactly those hosts:
>
> - `index.html` has `<script async src="https://www.googletagmanager.com/gtag/js?...">`
>   in the `<head>` of every page.
> - **11 of the 12 entries in `config.json`'s `logos` map are hotlinked**
>   `<img>` tags pointing at external CDNs — `cdn.voya.com`, `umass.edu`,
>   `pbs.twimg.com` (×2), `scontent-bos5-1.xx.fbcdn.net` (a Facebook CDN URL
>   with what looks like an expiring signed query string), `corporate.homedepot.com`,
>   `thayer.org`, `epicmovement.com`, and `images.squarespace-cdn.com` (×3).
>   Only `WorkHistoryComponent` (rendered on `/`) resolves `logoKey` against
>   this map, which is exactly why `/` is the one route with a Best Practices
>   and total-size failure and the other three only fail on script size.
>
> In the sandbox, every one of those requests failed before Chrome ever got a
> response — so the dev-box baseline counted them as ~0 bytes and no console
> error, producing a Best Practices score of 96 and a home-page total of
> 5.18 MB. On the real runner, with real internet access, they load for
> real: `gtag.js` adds its true weight to Script (the ~175 KB gap between
> 619,387 and 793,942 lines up almost exactly), the hotlinked images add
> their true weight to Total, and Chrome's automatic
> `"Failed to load resource: the server responded with a status of ___"`
> console logging for any failed/expired one of them is what the
> `errors-in-console` Best Practices audit is almost certainly penalizing.
> That last part is inference, not confirmed — the raw Lighthouse JSON that
> would show the exact audit line items lives in a workflow artifact on Azure
> Blob Storage, which this sandbox's egress policy also denies (`403` on
> `productionresultssa0.blob.core.windows.net`). The byte and score numbers
> above are read directly from the job logs, not the artifact, and are exact;
> the causal explanation is the best available reading of them.
>
> **The lesson, not just the fix:** a `lighthouse` job validated by pulling
> `npm run build` and running Lighthouse locally, in an environment with
> restricted egress, will silently under-measure any page that depends on
> third-party network resources — and this site's homepage does, non-trivially.
> Trust the numbers from an actual CI run over anything measured in a
> sandboxed dev environment.

Budgets are set at the real numbers above plus ~7% headroom. Byte budgets
stay `error` — they're deterministic on a given internet-connected runner.
`categories:best-practices` moved from `error`/`0.9` to `warn`/`0.7`: 0.74 is
the real, reproducible current state, not a regression this or any other PR
introduced, and gating on it would leave the job permanently red until the
hotlinking is fixed (§6.5) — same ratchet-not-gate reasoning already applied
to the a11y audits below. Timing/score budgets stay `warn` for the original
reason: this baseline still doesn't establish a stable timing number, only
stable byte counts.

Note the homepage's real ~6.97 MB total — up from the sandbox's optimistic
5.18 MB, and now confirmed to be dominated by hotlinked, unoptimized
corporate images rather than anything this repo controls the weight of. That
dwarfs JS and CSS combined and is the largest single performance lever in the
repo — worth its own entry in `desktop-performance.md`, and the reason §6.5
below tracks self-hosting those 11 images as a named follow-up.

Angular's own budget in `angular.json` is `initial` 2 MB warning / 5 MB error
against an actual initial payload of ~808 KiB. It is loose enough that it can
never fire; the LHCI byte budgets are what actually ratchet.

### 6.4 Accessibility findings surfaced immediately

Lighthouse flagged four failing audits on the first run. These are DOM-derived
and fully deterministic — no CI noise, and they overlap directly with Phase 4
of `playwright-e2e-testing-plan.md` (the unbuilt axe spec):

| Audit | Nodes | What it is |
| --- | --- | --- |
| `link-name` | **17** | Icon-only links (`about.contact` socials — `<a>` wrapping a Font Awesome `<i>` with no text and no `aria-label`) |
| `color-contrast` | 5 | `.nav-number` spans in the header |
| `heading-order` | 2 | `h5.workhistory-title` skipping a level |
| `aria-valid-attr-value` | 1 | ng-bootstrap nav tab `aria-selected` |

All four are set to `warn` so they surface in the report without blocking a
repo that already has them. `categories:accessibility` is gated at `error`
`minScore 0.85` (measured: 87 desktop / 95 mobile) so the score can't slide
further while they're outstanding. **Flip each audit to `error` as it's
fixed.** `link-name` at 17 nodes is the one worth doing first — icon-only
social links are unusable with a screen reader.

### 6.5 Follow-ups

- [ ] **Self-host the 11 hotlinked logos** (`voya`, `umassAmherst`,
      `umassResLife`, `manningCICS`, `braintreePS`, `homeDepot`, `projectRise`,
      `epicMovement`, `craigsDoors`, `fbcAmherst`, `ariseYouth` — all in
      `config.json`'s `logos` map). Download each into `src/assets`, point
      `logos[key].src` at the local copy. This is the actual fix for both the
      Best Practices score and the loose total-size budget — everything else
      in §6.3-6.4 is working around it, not fixing it. **Deliberately deferred**
      as of this writing (explicit call, not an oversight) — do this before
      trying to tighten `resource-summary:total:size` or promote
      `categories:best-practices` back to `error`.
- [ ] Fix `link-name` (17 nodes), then flip it to `error`.
- [ ] Re-baseline `categories:performance` / `cumulative-layout-shift` /
      `total-blocking-time` from CI runs; promote to `error`.
- [ ] Consider a scheduled Lighthouse run against **production**
      (`https://yannislam.org`) on the existing weekly cron — that is the only
      way to get TTFB and CDN behaviour into CI at all.
- [ ] Pin the Chrome version. The job uses whatever Chrome ships in the
      `ubuntu-latest` image, so scores shift when GitHub updates it. If
      timing thresholds ever become `error`, this becomes a real flake source.
- [ ] Add the image weight (now confirmed ~6.2 MB of the 6.97 MB home-page
      total, mostly the hotlinked logos above) to `desktop-performance.md`.

## 7. Tooling summary

| Tool | Cost | Open source | Fills |
| --- | --- | --- | --- |
| `actions/cache`, `actions/dependency-review-action` | free | yes | §2.1, §3.6 |
| [zizmor](https://github.com/zizmorcore/zizmor) | free | yes | §3.7 |
| CodeQL | free for public repos | no (free tier) | §3.5 |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard-action) | free | yes | §3.8 |
| [harden-runner](https://github.com/step-security/harden-runner) | free Community tier | partly | §3.8 |

## 8. Open decisions

1. **Are `build` / `unit-tests` / `e2e` required status checks?** Decides
   whether §2.4 ships as written or needs a reporting shim. Blocks Phase 4.
2. **4 workers or 3?** Empirical. Run Phase 1 with 4; watch the report for
   retried specs over a handful of runs before settling.
3. **Should CodeQL gate PRs or only report?** Recommend report-only at first
   (it will have opinions about the anime.js and RAF code), then gate on
   `high` once the baseline is clean.
4. **Is the `credentials` job's separate-job reporting deliberate?** If yes,
   drop §2.6 entirely — it is worth ~25s and nothing else.
