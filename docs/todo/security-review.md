# Security and code review: v3.yannislam.org

Reviewed 2026-10-28 from a static read of `.github/workflows/`, `vercel.json`, `scripts/` and `package-lock.json`, plus `npm audit --package-lock-only`. Nothing was built or deployed. For an agent to implement: one PR per item. This repo is already the strongest of the six on CI hygiene (SHA-pinned actions, zizmor, Dependabot cooldown, fail-closed analytics ID).

## High

1. **Dependabot auto-merge has no real gate.**
   - `dependabot-auto-merge.yml` merges patch and minor bumps of any dependency, including production ones, as soon as polled checks look green. The file itself says `main` has no branch protection.
   - Race: the job merges once a check named "Build & Test" exists and every *reported* check passed. A slow check that has not been created yet (for example Security/zizmor, Lighthouse) is not waited for.
   - Supply-chain risk: a malicious release that passes the unit tests is merged and then deployed by Vercel within minutes. The 7-day cooldown in `dependabot.yml` helps but does not cover security-update PRs.
   - Fix: turn on branch protection for `main` with required status checks (Build & Test, Security) and then use `gh pr merge --auto`, which waits for them natively; delete the polling loop. Keep auto-merge for dev dependencies and patch bumps only, and leave minor bumps of production dependencies for review.

## Medium

2. **CSP is report-only and has no report endpoint.** `vercel.json` sends `Content-Security-Policy-Report-Only` with `script-src 'self' 'unsafe-inline'` and nowhere for violations to go, so it protects nothing. Fix: (a) add `report-uri` or `report-to` (or watch the browser console in a test run); (b) remove `'unsafe-inline'` from `script-src` by moving the inline GA bootstrap in `src/index.html` to a file or hashing it at build time (extend `scripts/inject-env.js`); (c) switch to an enforcing `Content-Security-Policy` once clean. Angular's `style-src 'unsafe-inline'` may stay.
3. **`npm audit`: 9 high-severity findings, all in dev dependencies** (the `@lhci/cli` to `lighthouse` to `puppeteer-core` to `@puppeteer/browsers` to `proxy-agent` chain). `npm audit --omit=dev` reports 0, so nothing ships to visitors. They run in CI, though, so (a) bump `@lhci/cli` if a fixed release exists, else pin an override for the vulnerable transitive package, and (b) run Lighthouse in a job with `permissions: contents: read` and no secrets.
4. **`vercel-build-warnings.yml` posts Vercel build log lines to a PR comment.** Vercel masks secrets, but `npm warn` and error lines can contain paths and env names. Keep the filter, and also redact anything matching `/(token|secret|key)=\S+/i` before posting.

## Low

5. `release.yml` tags every successful Production deployment; the existing-tag check uses `matching-refs/tags/v` with an `.object.sha` compare, which misses annotated tags. Use `gh release view` for the SHA, or write the SHA into the release body and search for it.
6. `Permissions-Policy` blocks camera, microphone and geolocation; add `interest-cohort=()`/`browsing-topics=()` and `payment=()`, `usb=()`.
7. `Strict-Transport-Security` has `preload`; confirm the domain (and every subdomain, including mail and DNS-only hosts) really is HTTPS-only and submit it to the preload list, or drop `preload`.
8. `frame-src https:` in the report-only CSP is wide open; list the embeds the site actually uses.
9. `inject-env.js` fails the Vercel build when the GA ID is missing or malformed. Good; add a unit test for the pattern (`^G-[A-Z0-9]+$`) and for the placeholder path so a refactor cannot reintroduce a real fallback ID (CLAUDE.md forbids it).
10. `docs/reviews/` and `docs/changes/` are fine to publish; check none quote real analytics IDs or tokens before the repo's visibility could change.

## Checked, no finding

- Actions pinned by SHA with `persist-credentials: false`; `permissions: {}` at top level in `release.yml` and `vercel-build-warnings.yml`; zizmor runs weekly and on PRs.
- No secrets in the tree; the GA ID is injected at build time.
- Security headers: nosniff, `X-Frame-Options: DENY`, HSTS, COOP, strict referrer policy.

---

## Second pass (2026-10-29)

Read the Angular source (`src/app`, `src/server.ts`, `src/index.html`) and the repo's own docs. Nothing in the first pass has been implemented yet.

### New findings

1. **The link preview loads arbitrary third-party sites on hover (medium, privacy).** `link-preview.service.ts` creates an `<iframe sandbox="allow-scripts">` with `referrerpolicy="no-referrer"` and points it at each linked URL after a short hover delay (`attemptIframe`). A visitor who merely moves the mouse over a link makes their browser load that site (IP, cookies for its own origin are not sent because of the sandbox, but its scripts run). Fix: make the live preview opt-in (a "preview" button or long press), or allow-list the few origins that are known to render, and keep the card (icon, title, domain) as the default. The CSP's `frame-src https:` also allows this; tighten it to the allow-list.
2. **`CLAUDE.md` contradicts the repo (low).** It says `src/assets/resume-manifest.json` is "gitignored" and generated by the build hook, but the file is tracked (`git check-ignore` returns nothing) and `.gitignore` has no entry for it. Either ignore it and remove it from the index, or fix `CLAUDE.md`. As it stands, a stale committed manifest can name a resume file that is no longer the newest.
3. **`src/server.ts` is an unused Express server with no hardening (low until deployed).** Vercel serves `dist/.../browser` as static output (`vercel.json`), so this server is not in the deploy path. If it is ever run (the `pm_id` branch suggests PM2), add `helmet`, set `trust proxy`, keep `allowedHosts` in `angular.json` (currently `[]`, which blocks every host except localhost, so it must be set to the real hostnames before that), and delete the Firebase comment. Otherwise remove the file and the `outputMode: server` setting so there is one deploy shape.
4. **`linkify` is safe, keep the tests.** `linkify.pipe.ts` escapes every part and only turns `https?://` matches into links, so `javascript:` URLs cannot appear. It uses `bypassSecurityTrustHtml`; add a unit test with `javascript:alert(1)`, `"onmouseover=...` and `<img onerror>` inputs so a later "improvement" cannot regress it. The banner `[innerHTML]="text"` goes through Angular's sanitizer; keep `config.json` text free of markup that depends on stripped attributes.
