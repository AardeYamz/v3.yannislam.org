Date: 2026-11-23 04:10:40

# PR Previews: Reuse Builds And Debounce The Deploy

Steps 1 and 2 of [`docs/todo/pr-preview-build-dedup.md`](../todo/pr-preview-build-dedup.md) (#248, #249).

`pr-previews.yml` rebuilt every open PR on every PR event and deployed the `v3-prs` project each time. With 11 open PRs,
one merge to `main` (the `closed` event plus the `sync-prs.yml` fan-out) came to about 110 Angular builds there and 11
back-to-back deploys, each one replacing the last.

## What changed

- **`pr-previews.yml` builds only what is missing.** Each build is uploaded as `pr-<n>-<sha>` (kept 14 days). The
  `list` job builds the PR that triggered the run, plus any open PR whose head has no build and no other run working on
  it. A push now builds one preview; a `closed` event builds none. The workflow holds no secret any more.
- **The deploy moved to `pr-previews-deploy.yml`**, on `workflow_run` after each `PR previews` run, in one concurrency
  group without cancel-in-progress. A burst of runs ends in one or two deploys, and the "Wait for earlier deploys" loop
  is gone. Each deploy lists the open PRs when it starts and picks, per PR, the head's build; or "did not build" if the
  head's newest run failed; or, while the head is still building or waiting for approval, the PR's newest earlier build.
- Only artifacts from same-repo runs whose `head_sha` matches the name are used, so a fork's run cannot publish under a
  same-repo PR's path.
- The Vercel CLI in the deploy step is bumped from 65.14.0 to 66.6.0 (latest).
- The comment about `sync-prs.yml` pushes was wrong: they do start runs here, held as `action_required` until approved.

## What did not change

The site at `v3.yannislam.org/pr-<n>/`, its index page and headers, the PR comments, Vercel's Git previews and the
production deploy. The `deploy` job no longer shows among a PR's checks; it runs under Actions → PR previews deploy.

## Rollout

`workflow_run` workflows run only from `main`, so this PR gets no preview of its own and the new deploy is first
exercised after merge. Old artifacts were named `pr-<n>`, so the first run after merge builds every open PR once.
