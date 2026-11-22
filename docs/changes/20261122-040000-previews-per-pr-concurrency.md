# PR previews: one concurrency group per PR

Date: 2026-11-22 04:00:00

`pr-previews.yml` used a single concurrency group with `cancel-in-progress`, so
every new run cancelled the older PRs' runs and left them with cancelled
`list`, `build` and `deploy` checks (shown as blocked).

The group is now per PR, so a push cancels only that PR's own older run. Every
run still publishes all open PRs to one Vercel project, so the `deploy` job
gets a "Wait for earlier deploys" step: it waits until no earlier run of the
workflow is queued or in progress, which keeps deploys in run order and means a
run that listed fewer PRs never finishes after one that listed more.
