# Open Work

Summary of [docs/todo/README.md](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/README.md), in the order to pick items up. One PR per item, with a `docs/changes/` entry for each. Edit this page in the repo's `wiki/` folder, not in the wiki, and keep it in step with that file (status as of 2026-11-25).

1. **[security-review](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/security-review.md)**: several findings shipped. Open: branch protection on `main`, then `gh pr merge --auto` in `dependabot-auto-merge.yml` instead of the polling loop.
2. **[code-review-optimization](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/code-review-optimization.md)**: most items done. Open: #5 and #16 (header scroll performance), #6 and #15 (work-history carousel and template), #12 (`@angular/animations` to CSS).
3. **[desktop-performance](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/desktop-performance.md)**: open: CLS, service worker font/image strategy, project image compression, analytics script weight, cache headers, the Cloudflare to Vercel hop, per-region re-measure.
4. **[github-actions-speed-and-hardening](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/github-actions-speed-and-hardening.md)**: mostly shipped. Open: `paths-ignore`, a third e2e shard, Scorecard and harden-runner, Lighthouse follow-ups, repo-wide `contents: read` default.
5. **[design-system-consolidation](https://github.com/AardeYamz/yl-theme/blob/main/docs/design-system-consolidation.md)** (in yl-theme): a proposal; v3 already takes its tokens from yl-theme.
6. **[playwright-e2e-testing-plan](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/playwright-e2e-testing-plan.md)**: phases 1–3 shipped. Open: phase 4 (axe accessibility spec; visual regression deferred).
7. **[pr-preview-build-dedup](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/todo/pr-preview-build-dedup.md)**: steps 1–2 shipped. Open: step 3 (prebuilt `v3-prs` deploys, #250) and whether to skip Vercel previews of sync-prs merge commits (#251).

Not tied to a plan: decide whether `v3.yannislam.org.code-workspace` should be committed or git-ignored.
