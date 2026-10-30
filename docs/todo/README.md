# Open work

Plans for work not yet built, in the order to pick them up. Read `CLAUDE.md`
and `README.md` first, open one PR per item, and add a `docs/changes/` entry
for each (naming rule in `CLAUDE.md`). When a plan is finished, say so in its
own status line and drop it from this list.

Status as of 2026-10-30.

## Queue

1. **[`security-review.md`](security-review.md)** (2026-10-28, second pass
   2026-10-29). None of it is implemented yet. Start with the High item:
   branch protection on `main`, then `gh pr merge --auto` in
   `dependabot-auto-merge.yml` instead of the polling loop.
2. **[`code-review-optimization.md`](code-review-optimization.md)**. Done:
   #1–#4, #7–#11, #13, #14, #17 (see the `20260925-*` and `20260928-*`
   entries in `docs/changes/`). Open: #5 and #16 (header scroll performance
   and cleanups), #6 and #15 (work-history carousel and template), #12
   (`@angular/animations` to CSS).
3. **[`desktop-performance.md`](desktop-performance.md)**. Prerendering, the
   Font Awesome trim, image resizing and lazy `animejs` have shipped. Open:
   CLS (work-history image aspect ratios, re-measure after the loading-screen
   work), service worker font/image strategy, project image compression,
   analytics script weight, cache headers in `vercel.json`, the Cloudflare to
   Vercel hop, and a per-region re-measure. Some boxes there are stale; tick
   them against `docs/changes/` as you go.
4. **[`github-actions-speed-and-hardening.md`](github-actions-speed-and-hardening.md)**.
   Most of it has shipped. Open: §2.4 `paths-ignore` (only after checking
   which checks branch protection requires), §2.3 a third shard (only if it
   still saves 30 s or more), §3.8 Scorecard and harden-runner, the Lighthouse
   follow-ups in §6, and the repo-wide `contents: read` default (a manual
   settings change).
5. **[`design-system-consolidation.md`](design-system-consolidation.md)**. A
   proposal, nothing built. Phases 1–2 must change no pixels; Phase 3 needs
   the reviewer's decisions first. Phase 3 of the yl-theme plan has v3 take
   its tokens from `yl-theme`.
6. **[`playwright-e2e-testing-plan.md`](playwright-e2e-testing-plan.md)**.
   Phases 1–3 have shipped. Open: Phase 4 (`accessibility.spec.ts` with axe;
   visual regression, deferred).

## Not tied to a plan

- Phase 2 of `yl-theme/docs/plan-serve-from-yannislam-org.md`: add the
  `/theme/:path*` rewrite to `vercel.json`.
- Decide whether `v3.yannislam.org.code-workspace` should be committed or
  git-ignored (it is neither today; `.gitignore` covers only
  `*.sublime-workspace`).
