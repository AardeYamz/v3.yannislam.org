# Agent to-dos: v3.yannislam.org

Read `CLAUDE.md` and `README.md` first. The detailed plans live in `docs/todo/`; this file orders them. Add a `docs/changes/` entry for each PR.

- [ ] Branch `remove-aikido-workflow` is 15 commits behind: merge `origin/main`, then open the PR.
- [ ] `docs/todo/github-actions-speed-and-hardening.md`: close the open boxes (§2.4 `paths-ignore` once branch protection is checked; §2.3 third shard only if it still saves 30s+; the repo-wide `contents: read` default is manual).
- [ ] `docs/todo/code-review-optimization.md`: fix the literal `%GOOGLE_ANALYTICS_ID%` on direct loads, remove unused deps, and replace non-signal `effect` reads.
- [ ] `docs/todo/desktop-performance.md`: CLS and oversized images.
- [ ] `docs/todo/design-system-consolidation.md`: Phases 1-2 must change no pixels. Phase 3 of the yl-theme plan has v3 take its tokens from `yl-theme`.
- [ ] `docs/todo/playwright-e2e-testing-plan.md`: finish the remaining phases.
- [ ] Phase 2 of `yl-theme/docs/plan-serve-from-yannislam-org.md`: add the `/theme/:path*` rewrite to `vercel.json`.
- [ ] Decide whether to commit `v3.yannislam.org.code-workspace` or git-ignore it.
