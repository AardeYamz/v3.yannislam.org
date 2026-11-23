# Fewer Duplicate Builds For PR Previews

Status (2026-11-23): Steps 1 and 2 are built
([`20261123-041040-pr-preview-build-reuse.md`](../changes/20261123-041040-pr-preview-build-reuse.md), #248, #249).
Open: Step 3 (#250) and the decision in section 3 (#251).

Two Vercel projects deploy this repo's pull requests, and GitHub Actions builds the same commits again and again to feed one
of them. This plan cuts the repeated builds **without changing what anyone sees**: every open PR stays at
`v3.yannislam.org/pr-<n>/` at its current head, Vercel's own per-branch preview URLs stay, and every PR comment and
release keeps working.

## 1. What happens today

| Project | Connected to Git? | Deploys | Built where |
| --- | --- | --- | --- |
| `v3-yannislam-org` | yes | production on every push to `main`; a preview for every push to a PR branch | on Vercel (`npm run build`) |
| `v3-prs` | no | production, from [`pr-previews.yml`](../../.github/workflows/pr-previews.yml), on every PR open/sync/reopen/close | in Actions; Vercel then runs its own (empty) build of the static upload |

`pr-previews.yml` rebuilds **every** open PR on **every** PR event, because each deploy replaces the whole `v3-prs` site.
With N open PRs (11 today), one event costs N Angular builds, N−1 of them commits that were already built.

The expensive case is a merge to `main`:

1. Vercel builds production (`v3-yannislam-org`). Needed.
2. The PR's `closed` event runs `pr-previews.yml`: N−1 builds, one `v3-prs` deploy.
3. [`sync-prs.yml`](../../.github/workflows/sync-prs.yml) merges `main` into the N−1 other branches. Each push starts:
   - a Vercel Git preview build in `v3-yannislam-org` (N−1 builds), and
   - a `pr-previews.yml` run (shown as `action_required` until approved; the 2026-11-23 03:54 burst had ten), each of
     which builds all N−1 PRs and deploys `v3-prs` again.

With N = 11 that is about **1 + 10 + 10 + 10 × 10 ≈ 120 Angular builds and 11 `v3-prs` deploys for one merge**, where
the deploys land minutes apart and each supersedes the last. In the Vercel deployments list this shows as bursts of
10 to 12 `v3-prs` production deploys within a few minutes, interleaved with a run of `v3-yannislam-org` previews for the
same branches. All of them share the team's build queue, so they also delay each other.

### What must not change

- `v3.yannislam.org/pr-<n>/` (and `v3.yannisl.am/pr-<n>/`) serves every open same-repo PR at its latest head, with the
  index page, noindex headers and `/pr-<n>/` base href.
- Each PR keeps its "Preview: … (deployed `<sha>`)" or "No preview available" comment.
- Vercel's Git previews in `v3-yannislam-org` keep running: they give the per-branch `*.vercel.app` URL and the
  Vercel-environment build log that [`vercel-build-warnings.yml`](../../.github/workflows/vercel-build-warnings.yml)
  comments.
- Production stays a Git deploy: [`release.yml`](../../.github/workflows/release.yml) tags on its `deployment_status`.
- PR code is never built in a job that holds `VERCEL_TOKEN`, and nothing that builds PR code writes `main`'s cache.

## 2. The plan

Three changes, each a PR of its own, in this order (the first two do almost all the work). Together they take the merge case from about 120 builds and 11
deploys to about 21 builds and two or three deploys, and a plain push to a PR from N + 2 builds to 3.

### Step 1: build only the PR that changed, reuse the rest

The output of `npm run build -- --base-href /pr-<n>/` depends only on the PR number and the commit, so a build can be
reused by any later run.

- In the `build` job, name the artifact `pr-<n>-<sha>` (full sha) and keep it longer: `retention-days: 14` (PRs that sit
  longer are simply rebuilt).
- In `list`, for each open PR, look the artifact up by name
  (`gh api "repos/$GH_REPO/actions/artifacts?name=pr-$n-$sha" --jq '[.artifacts[] | select(.expired | not)][0].id'`).
  Output two lists: `prs` (all open PRs, as now) and `missing` (those with no live artifact). Build the matrix from
  `missing` only. The PR that triggered the run is normally the only one missing.
- In `deploy`, download each PR's artifact by id (`gh api repos/$GH_REPO/actions/artifacts/<id>/zip`, unzip into
  `site/pr-<n>/`) instead of `actions/download-artifact` with `pattern: pr-*`, which only sees the current run.
  `actions: read` is already granted.
- A PR whose build failed has no artifact, so it is in `missing` again on the next run and is retried, as today; it still
  gets the "did not build" comment.

Effect: a PR push builds one preview instead of N; a `closed` event builds none and only redeploys.
Behaviour: unchanged (the site always ends at every PR's head; the artifacts are the same files the old matrix produced).

### Step 2: one deployer, debounced, outside the PR checks

Move the `deploy` job into a new workflow, `pr-previews-deploy.yml`, triggered by
`workflow_run: { workflows: [PR previews], types: [completed] }`, with:

```yaml
concurrency:
  group: pr-previews-deploy
  cancel-in-progress: false
```

GitHub keeps one running and at most one pending run per group and drops older pending ones, so a burst of ten
`pr-previews.yml` runs leads to two or three deploys, the last of which lists the PRs fresh and has every head. That
replaces the "Wait for earlier deploys" polling loop, which exists only because runs could deploy out of order.

- The deploy re-lists open PRs itself (not from the triggering run), then uses Step 1's lookup to find each head's
  artifact. If a head's build is still running, publish that PR's newest earlier artifact; its own run's completion
  triggers another deploy. If the head's run failed, post "No preview available" as today.
- `workflow_run` runs from `main`'s copy of the file with secrets, in `main`'s cache scope. It must not check out PR
  code or use `actions/cache` / `setup-node` caching (it needs neither: it only unzips files and calls the Vercel CLI).
- A superseded pending deploy is cancelled in this workflow, which is not attached to any PR, so no PR shows a cancelled
  check (the reason [#242](https://github.com/AardeYamz/v3.yannislam.org/pull/242) split concurrency per PR).
- `pr-previews.yml` keeps its per-PR concurrency group and loses `pull-requests: write` and `VERCEL_*`.

Check before merging: whether branch protection lists "PR previews / deploy" as a required check. If it does, drop it
there, since the job leaves that workflow.

Behaviour: the same site and comments. The only visible difference is that the "deploy" job is no longer among a PR's
checks; it appears under Actions → PR previews deploy instead.

### Step 3: let `v3-prs` skip Vercel's build step

`vercel deploy site --prod` uploads the files and Vercel still runs a build (framework "Other", nothing to build) in the
shared queue. The build itself is short (about 4 s for `dpl_2LLgPpKtWJdSAiYWcvD38znrVgJL`), but that deploy waited 17 s
for a build slot, and during a burst each one waits behind the `v3-yannislam-org` previews. This is the smallest of the
three savings; do it last, or skip it if Step 2 already makes the bursts rare. Build locally and upload the output
instead:

```bash
npx --yes vercel@<pinned> pull --yes --environment=production --token "$VERCEL_TOKEN"
npx --yes vercel@<pinned> build --prod --token "$VERCEL_TOKEN"     # turns site/ and its vercel.json into .vercel/output
npx --yes vercel@<pinned> deploy --prebuilt --prod --token "$VERCEL_TOKEN"
```

Run these with `site/` as the working directory (or set the project's root directory to match), and bump the pinned CLI
to the latest release when doing it. The deployment still appears in the Vercel list, but with no build, so it no longer
waits in the queue behind `v3-yannislam-org` previews or holds them up.

Verify on the first run: in the deployment's details, the build step should be absent or near zero, and the headers
from the generated `vercel.json` (`X-Robots-Tag`, `Cache-Control`) must still be served
(`curl -sI https://v3.yannislam.org/pr-<n>/`).

## 3. Optional, and a behaviour change: the `sync-prs.yml` fan-out on Vercel

After Steps 1 to 3 the largest remaining cost is the N−1 Vercel Git preview builds of the `Merge main into <branch>`
commits after every merge. They rebuild branches whose only new content is what `main` just shipped. They could be
skipped with an Ignored Build Step in `vercel.json`, e.g. an `ignoreCommand` that exits 0 when `HEAD` is a merge
commit made by `github-actions[bot]` with the message `Merge main into …`.

Not recommended without a decision, because it does change behaviour:

- the branch's `*.vercel.app` preview stays on the previous commit, and Vercel's status on the PR head reads
  "canceled/ignored" instead of "ready";
- `vercel-build-warnings.yml` is not refreshed for that commit (check which `deployment_status` state an ignored build
  sends, so it does not post a misleading comment).

`v3-prs` would still refresh, because Step 1 builds the synced head there.

## 4. Considered and rejected

- **Reuse the Vercel preview or `build-test.yml`'s `dist/` for `/pr-<n>/`.** The base href is baked into every
  prerendered page and into `ngsw.json`, whose hash table includes `index.html`. Rewriting the base href after the build
  breaks the service worker's integrity check. A `/pr-<n>/` build has to be its own build.
- **Turn off Git previews in `v3-yannislam-org`** (`git.deploymentEnabled`) and deploy them from Actions with
  `--prebuilt`. Saves one build per push but loses the Vercel-environment build log (the point of
  `vercel-build-warnings.yml`) and changes the deployment events the bots react to.
- **One concurrency group for all of `pr-previews.yml` with cancel-in-progress.** Cheapest, but leaves PRs with
  cancelled checks; that is what #242 removed. Step 2 gets the same debounce without it.
- **`actions/cache` instead of artifacts in Step 1.** Caches written by a `pull_request` run are scoped to that PR's
  merge ref, so other PRs' runs cannot read them.

## 5. Checking it

For each step's PR:

1. `act -l` from the main checkout (proves the workflows parse). The jobs need the GitHub API, real artifacts and
   `VERCEL_TOKEN`, so run them with `act -n` only and test for real on the PR.
2. On the PR itself, with several PRs open: push once and check that the `build` matrix has one leg (Step 1); close or
   merge a PR and check that the `closed` run builds nothing (Step 1); after a merge to `main` and the sync fan-out,
   count `v3-prs` deploys in the Vercel deployments list (Step 2: two or three, not ten) and check their build
   duration (Step 3).
3. Every open PR's `/pr-<n>/` serves its head sha (the index page lists the sha), and each PR comment names it.

Rollback for any step is reverting its PR; nothing outside the repo changes, apart from branch protection in Step 2 if
the deploy check was required.
