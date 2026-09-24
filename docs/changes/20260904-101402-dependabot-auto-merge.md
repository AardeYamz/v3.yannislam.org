Date: 2026-09-04 10:14:02

# Dependabot Auto-Merge

## What changed

Added `.github/workflows/dependabot-auto-merge.yml`. It watches PRs opened
by `dependabot[bot]` against `main` and enables GitHub's native auto-merge
(`gh pr merge --auto --squash`) on the ones judged safe:

- any patch or minor version bump, regardless of dependency
- a major version bump of a dev-only dependency (`direct:development`),
  since those never ship in the built bundle (the same reasoning already
  written into the `testing` group's comment in `dependabot.yml`)

A major bump of a production dependency is left alone for manual review,
same as today.

Update type and dependency type come from `dependabot/fetch-metadata`,
which reads them off the PR itself rather than re-parsing the title/body.

## Why `pull_request_target`

Dependabot PRs run with a read-only, restricted token under the default
`pull_request` event. Enabling auto-merge needs `contents: write` +
`pull-requests: write`, which only a `pull_request_target` job gets for a
PR opened by another actor. The job never checks out or runs anything from
the PR head — it only calls the GitHub API (via `fetch-metadata` and
`gh pr merge`) — so it doesn't have the injection risk `pull_request_target`
normally carries when combined with a checkout of untrusted code.

## Why this only *enables* auto-merge, not an immediate merge

`gh pr merge --auto` flags the PR to merge itself once the branch is
mergeable and GitHub considers all *required* status checks green — it
does not merge on the spot. That means "once CI + Vercel preview pass" is
enforced by branch protection, not by this workflow:

**One-time manual step**: under Settings → Branches → the rule for `main`,
add "Require status checks to pass" and mark at least the `Build & Test`
jobs (`unit-tests`, `build`) and `Vercel` as required. Without that, GitHub
has nothing to wait on and will merge as soon as the PR is mergeable.

## Left out of scope

- Branch protection itself isn't configured by this change (no API access
  to repo settings from this session) — see the manual step above.
- The e2e/Lighthouse jobs in `build-test.yml` aren't recommended as
  required checks here; they're comparatively slow and not what "safe
  dependency bump" hinges on, but nothing stops adding them too.
