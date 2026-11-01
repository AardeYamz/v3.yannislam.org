# Agent to-dos: v3.yannislam.org

Read `CLAUDE.md` and `README.md` first. The detailed plans live in `docs/todo/`; this file orders them. Add a `docs/changes/` entry for each PR.

## Open

- [ ] Branch `remove-aikido-workflow` is 15 commits behind: merge `origin/main`, then open the PR.
- [ ] `docs/todo/github-actions-speed-and-hardening.md`: close the open boxes (§2.4 `paths-ignore` once branch protection is checked; §2.3 third shard only if it still saves 30s+; the repo-wide `contents: read` default is manual).
- [ ] `docs/todo/desktop-performance.md`: remaining items are CLS from the work-history images (needs per-image dimensions), project-image compression, third-party logos, `link-name` axe failures, and the P3 delivery/TTFB checks.
- [ ] `docs/todo/design-system-consolidation.md`: Phases 1-2 must change no pixels. Phase 3 of the yl-theme plan has v3 take its tokens from `yl-theme`.
- [ ] `docs/todo/playwright-e2e-testing-plan.md`: the P0/P1 specs exist except `accessibility.spec.ts` (needs `@axe-core/playwright`); `visual.spec.ts` is optional/P2.
- [ ] **@angular/animations is still the one deprecated runtime package** (code-review #12): `fade-stagger.animation.ts` + `provideAnimations()` in `app.config.ts`. Migrate to CSS keyframes / `animate.enter`/`animate.leave`.
- [ ] Phase 2 of `yl-theme/docs/plan-serve-from-yannislam-org.md`: add the `/theme/:path*` rewrite to `vercel.json`. The plan lives in the separate `yl-theme` repo, so this needs that document's destination URL before wiring it up.
- [ ] Lighthouse follow-ups listed in `docs/todo/github-actions-speed-and-hardening.md` §6.5 (self-host hotlinked logos, `link-name`, re-baseline budgets, pin Chrome).

## Recently closed (do not redo)

- [x] `docs/todo/code-review-optimization.md` P0: GA placeholder (browser **and** SSR output), the `target="_black"` typo, the `/home` navigation, and the oversized About portrait are all fixed.
- [x] P1: scroll handlers, the owl carousel, `ngx-typed-js`, `LinkPreviewService` timer cleanup, and the service-worker font/image strategy are all shipped.
- [x] P2 unused deps: nothing removable — `@angular/forms` and `@angular/localize` are peer dependencies of `@ng-bootstrap/ng-bootstrap`, and `express` backs prerendering (`outputMode: "server"`).
- [x] P3 typed config, standalone/signals migration, work-history template cleanup, header cleanups, non-signal effect reads, and the loading-screen timer/overflow/reduced-motion fixes are shipped.
- [x] `v3.yannislam.org.code-workspace` decision: not tracked; `*.code-workspace` is now git-ignored.
