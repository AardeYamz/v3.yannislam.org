# Documentation Guide

Mirrors [docs/README.md](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/README.md). All links below go to files in the repo.

| Folder | Holds |
|---|---|
| [`docs/changes/`](https://github.com/AardeYamz/v3.yannislam.org/tree/main/docs/changes) | Write-ups of work already done: what changed, why, how it was verified. Read the ones for an area before changing it |
| [`docs/todo/`](https://github.com/AardeYamz/v3.yannislam.org/tree/main/docs/todo) | Plans for work not yet built, ordered in its README. See [Open Work](Open-Work) |
| [`docs/reviews/`](https://github.com/AardeYamz/v3.yannislam.org/tree/main/docs/reviews) | Point-in-time reviews and audits. They record what was true when written; follow-up work goes in `todo/` |

Older write-ups describe the code as it was then (for example the NgModule app before the standalone migration). Where one contradicts the code, trust the code and the newer write-up.

## Reviews

- [PR #16, Material Design 3 tokens](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/reviews/pr-16-material-design-3-review.md)
- [PR #24, SSR prerendering](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/reviews/pr-24-ssr-prerendering-review.md)
- [Whole-repo audit work list, 2026-11-09](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/reviews/audit-findings-2026-11-09.md)
- [Whole-repo security review, 2026-10-26](https://github.com/AardeYamz/v3.yannislam.org/blob/main/docs/reviews/security-audit-2026-10-26.md): findings 1 (CSP, now report-only) and 7 (GA ID fail-closed) acted on; follow-up in `todo/security-review.md`

## Change write-ups by area

Base path: `docs/changes/`. Filenames start with their date, so they sort chronologically.

| Area | Write-ups |
|---|---|
| Angular upgrades and architecture | UPGRADE-NOTES, config-dedup-refactor, zoneless-change-detection, ssr-prerendering, typed-site-config-model, standalone-and-signals-migration |
| Content sections | volunteering-section, projects-section, extract-ui-strings |
| Animation and visuals | animejs-loading-screen, logo-svg-dark-mode, floating-logos-banner, pause-floating-logos-visibility, link-preview-tooltips |
| Header and nav | header-scroll-effects, consolidate-header-scss, fix-hamburger-menu-accessibility, fix-mobile-drawer-hidden-nav-entry, fix-footer-bottom-transition, fix-header-nav-aria-valid-attr-value |
| Design system | material-design-3-tokens; [design-system-extraction](https://github.com/AardeYamz/yl-theme/blob/main/docs/design-system-extraction.md) (yl-theme repo) |
| Performance and bundle size | css-bundle-trim, font-trimming, js-runtime-perf, preconnect-gtag, trim-ngbootstrap-imports, desktop-cls-fixes, dependency-and-bundle-trim, raise-lighthouse-font-budget |
| PWA, SEO and accessibility | service-worker-pwa, seo-fixes, agentic-browser-accessibility |
| Analytics | google-analytics, vercel-analytics, ga-id-fail-closed |
| Security | csp-report-only |
| Testing | playwright-e2e-testing, playwright-e2e-phase-3, fix-e2e-loading-overlay-race |
| CI and dependencies | dependabot-aikido-integration, github-actions-speed-and-hardening, dependabot-auto-merge, lockfile-resync-after-dependabot, ci-runner-and-node-bump, remove-aikido-workflow, pr-previews |
| Documentation | consolidate-documentation |
| Cleanups | remove-footer-deployment-status, remove-workhistory-debug-handler, fix-braintreePS-logo-console-error, p0-fixes-from-code-review-backlog, small-cleanups-from-code-review-backlog |

Browse the [folder](https://github.com/AardeYamz/v3.yannislam.org/tree/main/docs/changes) for the exact filenames and the newest entries.
