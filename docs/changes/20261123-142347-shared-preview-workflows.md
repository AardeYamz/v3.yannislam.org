Date: 2026-11-23 14:23:47

# PR Previews Use The Shared Workflows

Phase 1 of the CI centralization plan (`AardeYamz/workflows` `docs/centralization-plan.md`).

`pr-previews.yml` and `pr-previews-deploy.yml` were the model for `preview-build.yml` and `preview-deploy.yml` in
`AardeYamz/workflows`; they are now short callers of those, pinned at v1.0.4. The behaviour is unchanged: each open
same-repo PR is built once per commit as artifact `pr-<n>-<sha>`, a single-lane deploy publishes the newest build of every
PR to the static previews project, and a comment links each preview. What stayed here: the Angular build command and
output folder, the index page and `vercel.json`, and the Vercel deploy command.

Known differences: the build no longer sets `NPM_CONFIG_*` env (the install flags are passed instead), and the deploy
comment marker and artifact names are as before.
