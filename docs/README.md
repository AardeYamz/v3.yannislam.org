# Documentation

The repo's own docs, beyond the root [`README.md`](../README.md) (what the
site is, how to build, test and deploy it) and [`CLAUDE.md`](../CLAUDE.md)
(conventions for changing it).

| Folder | Holds | Naming |
|---|---|---|
| [`changes/`](changes/) | Write-ups of work already done: what changed, why, and how it was verified. Read the ones for an area before changing it. | `YYYYMMDD-HHMMSS-kebab-case-title.md` with a matching `Date:` header (rules in `CLAUDE.md`) |
| [`todo/`](todo/) | Plans for work not yet built, or only partly built. [`todo/README.md`](todo/README.md) orders them and gives each one's status. | Free-form kebab-case |
| [`reviews/`](reviews/) | Point-in-time reviews: measured reviews of specific PRs, and audits. They record what was true when written; follow-up work goes in `todo/`. | `pr-<number>-<slug>.md` for a PR, `<topic>-YYYY-MM-DD.md` for an audit |

## Reviews

- [`pr-16-material-design-3-review.md`](reviews/pr-16-material-design-3-review.md): PR #16, Material Design 3 tokens
- [`pr-24-ssr-prerendering-review.md`](reviews/pr-24-ssr-prerendering-review.md): PR #24, SSR prerendering
- [`security-audit-2026-10-26.md`](reviews/security-audit-2026-10-26.md): whole-repo security review. Findings 1 (CSP, now report-only) and 7 (GA ID fail-closed) have been acted on; the 2026-10-28 follow-up is in [`todo/security-review.md`](todo/security-review.md)

## Change write-ups by area

Filenames start with their date, so `ls docs/changes` is already
chronological. By area:

| Area | Write-ups |
|---|---|
| Angular upgrades and architecture | [`20260727-205542-UPGRADE-NOTES`](changes/20260727-205542-UPGRADE-NOTES.md), [`20260728-160203-config-dedup-refactor`](changes/20260728-160203-config-dedup-refactor.md), [`20260810-211125-zoneless-change-detection-1`](changes/20260810-211125-zoneless-change-detection-1.md), [`20260811-013939-ssr-prerendering`](changes/20260811-013939-ssr-prerendering.md), [`20260928-074955-typed-site-config-model`](changes/20260928-074955-typed-site-config-model.md), [`20260928-081123-standalone-and-signals-migration`](changes/20260928-081123-standalone-and-signals-migration.md) |
| Content sections | [`20260727-214549-volunteering-section`](changes/20260727-214549-volunteering-section.md), [`20260728-211600-projects-section`](changes/20260728-211600-projects-section.md) |
| Animation and visuals | [`20260728-132036-animejs-loading-screen`](changes/20260728-132036-animejs-loading-screen.md), [`20260728-151017-logo-svg-dark-mode`](changes/20260728-151017-logo-svg-dark-mode.md), [`20260729-090717-floating-logos-banner`](changes/20260729-090717-floating-logos-banner.md), [`20260731-210605-pause-floating-logos-visibility`](changes/20260731-210605-pause-floating-logos-visibility.md), [`20260811-024526-link-preview-tooltips`](changes/20260811-024526-link-preview-tooltips.md) |
| Header and nav | [`20260731-184800-header-scroll-effects-2`](changes/20260731-184800-header-scroll-effects-2.md), [`20260803-211756-consolidate-header-scss`](changes/20260803-211756-consolidate-header-scss.md), [`20260810-211125-fix-hamburger-menu-accessibility`](changes/20260810-211125-fix-hamburger-menu-accessibility.md), [`20260811-225221-fix-mobile-drawer-hidden-nav-entry`](changes/20260811-225221-fix-mobile-drawer-hidden-nav-entry.md), [`20260815-044616-fix-header-nav-aria-valid-attr-value`](changes/20260815-044616-fix-header-nav-aria-valid-attr-value.md) |
| Design system | [`20260811-225106-material-design-3-tokens`](changes/20260811-225106-material-design-3-tokens.md), [`design-system-extraction`](https://github.com/AardeYamz/yl-theme/blob/main/docs/design-system-extraction.md) (in the yl-theme repo) |
| Performance and bundle size | [`20260731-184800-css-bundle-trim`](changes/20260731-184800-css-bundle-trim.md), [`20260731-184800-font-trimming-1`](changes/20260731-184800-font-trimming-1.md), [`20260731-184800-js-runtime-perf-3`](changes/20260731-184800-js-runtime-perf-3.md), [`20260731-210605-preconnect-gtag-1`](changes/20260731-210605-preconnect-gtag-1.md), [`20260731-210605-trim-ngbootstrap-imports-2`](changes/20260731-210605-trim-ngbootstrap-imports-2.md), [`20260813-012444-desktop-cls-fixes`](changes/20260813-012444-desktop-cls-fixes.md), [`20260925-081301-dependency-and-bundle-trim`](changes/20260925-081301-dependency-and-bundle-trim.md), [`20261016-131431-raise-lighthouse-font-budget`](changes/20261016-131431-raise-lighthouse-font-budget.md) |
| PWA, SEO and accessibility | [`20260731-184800-service-worker-pwa-5`](changes/20260731-184800-service-worker-pwa-5.md), [`20260731-184800-seo-fixes-4`](changes/20260731-184800-seo-fixes-4.md), [`20260823-140532-agentic-browser-accessibility`](changes/20260823-140532-agentic-browser-accessibility.md) |
| Analytics | [`20260727-205542-google-analytics-1`](changes/20260727-205542-google-analytics-1.md), [`20260731-184800-vercel-analytics-6`](changes/20260731-184800-vercel-analytics-6.md), [`20261027-014549-ga-id-fail-closed`](changes/20261027-014549-ga-id-fail-closed.md) |
| Security | [`20261027-020046-csp-report-only`](changes/20261027-020046-csp-report-only.md) |
| Testing | [`20260811-030901-playwright-e2e-testing`](changes/20260811-030901-playwright-e2e-testing.md), [`20260811-115249-playwright-e2e-phase-3`](changes/20260811-115249-playwright-e2e-phase-3.md), [`20261018-195354-fix-e2e-loading-overlay-race`](changes/20261018-195354-fix-e2e-loading-overlay-race.md) |
| CI and dependencies | [`20260811-124323-dependabot-aikido-integration`](changes/20260811-124323-dependabot-aikido-integration.md), [`20260812-002233-github-actions-speed-and-hardening`](changes/20260812-002233-github-actions-speed-and-hardening.md), [`20260904-101402-dependabot-auto-merge`](changes/20260904-101402-dependabot-auto-merge.md), [`20261019-134240-lockfile-resync-after-dependabot`](changes/20261019-134240-lockfile-resync-after-dependabot.md), [`20261019-181637-ci-runner-and-node-bump`](changes/20261019-181637-ci-runner-and-node-bump.md), [`20261021-000000-remove-aikido-workflow`](changes/20261021-000000-remove-aikido-workflow.md) |
| Documentation | [`20261030-042800-consolidate-documentation`](changes/20261030-042800-consolidate-documentation.md) |
| Cleanups | [`20260803-211756-remove-footer-deployment-status-1`](changes/20260803-211756-remove-footer-deployment-status-1.md), [`20260803-211756-remove-workhistory-debug-handler-2`](changes/20260803-211756-remove-workhistory-debug-handler-2.md), [`20260817-013259-fix-braintreePS-logo-console-error`](changes/20260817-013259-fix-braintreePS-logo-console-error.md), [`20260925-073726-p0-fixes-from-code-review-backlog`](changes/20260925-073726-p0-fixes-from-code-review-backlog.md), [`20260928-083319-small-cleanups-from-code-review-backlog`](changes/20260928-083319-small-cleanups-from-code-review-backlog.md) |

Older write-ups describe the code as it was then (for example, the NgModule
app before the standalone migration). Where one contradicts the code, trust
the code and the newer write-up.
