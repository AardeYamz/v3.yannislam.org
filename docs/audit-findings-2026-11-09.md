# Audit findings: 2026-11-09

Work list for a later fixing agent. Nothing here has been fixed. Each item lists its evidence, why it matters, a suggested fix and how to verify the fix. Tick a box when the fix is merged.

Audited at `origin/main` 4be635ab. Items already tracked in other docs or in an open PR are not repeated; see [Tracked elsewhere](#tracked-elsewhere).

## Summary

| Severity | Count | Items |
|---|---|---|
| Critical | 0 | |
| High | 1 | SEC-1 (withheld, see private report) |
| Medium | 7 | M-1 to M-6, SEC-2 (withheld, see private report) |
| Low | 18 | L-1 to L-18 |

Verified by running: `npm ci` (ok), `npm run test:scripts` (19/19), `npm test` (Karma, 188/188, one jasmine-core ESM deprecation warning), `npm run build` (ok, 4 routes prerendered), `npm audit --package-lock-only` (9 high, all in the `@lhci/cli` chain, already tracked). Not run: Playwright e2e and Lighthouse (browsers not installed in the audit environment).

## High

- [ ] SEC-1: security item withheld from public file — see private report.

## Medium

- [ ] SEC-2: security item withheld from public file — see private report.

- [ ] **M-1. Canonical URL and `og:url` are the home page on every route.**
  - Where: `src/index.html:33` (`<link rel="canonical">`), `src/index.html:37` (`og:url`).
  - What: the single `index.html` template is shared by all prerendered routes, so `/projects`, `/projects/highschool` and `/aardeyamz` ship a canonical of `https://yannislam.org`. No code sets per-route values (`app.component.ts` says it deliberately does not touch these tags). Confirmed in the built output (`dist/.../browser/projects/index.html`, `aardeyamz/index.html`).
  - Why: search engines are told the sub-pages are duplicates of `/`, which undermines the sitemap (`src/sitemap.xml`) that lists them.
  - Fix: set canonical and `og:url` per route from the route's path (for example a route `data` value read in `AppComponent`, or a prerender-time step in `scripts/`). Keep the root default. Coordinate with the translation PRs (#178, #183, #187, #188, #191), which will need `hreflang` as well.
  - Verify: `grep -o 'rel="canonical"[^>]*' dist/v3.yannislam.org/browser/projects/index.html` shows `https://yannislam.org/projects`; the same for `aardeyamz` and `projects/highschool`.

- [ ] **M-2. `ThemeService` reads `localStorage` unguarded during construction.**
  - Where: `src/app/services/theme/theme.service.ts:44` (field initialiser calls `resolveInitialMode()`), `:78-86` (`localStorage.getItem` with no `try`), `:64` and `:73` (`getItem`/`setItem` without `try`).
  - What: the loading screen and header inject this service on every page. If the browser throws on storage access (storage blocked, some privacy modes), the constructor throws and bootstrap can fail. Not reproduced in a live browser; found by reading the code.
  - Why: a visitor with storage disabled could get a broken site, not just no saved theme.
  - Fix: wrap every storage access in `try`/`catch` and fall back to the `matchMedia` result, as the CLAUDE.md "SSR" rules already require for `window`/`document`.
  - Verify: add a spec that makes `localStorage.getItem` throw and asserts `ThemeService` still constructs with mode `default`/`light` from `matchMedia`; run `npm test`.

- [ ] **M-3. Contact section copy is hardcoded in the template.**
  - Where: `src/app/components/home/contact/contact.component.html:5` ("05. What's Next"), `:7` ("Get in touch!"), `:11-13` (paragraph), `:19` ("Say Hello").
  - What: these strings are not in `config.json`, against the CLAUDE.md rule "No user-visible text in templates". The paragraph also contains leftover template copy ("Simple one-page design that features a profile letter with basic information about a person."), which is visible to every visitor.
  - Why: public content is wrong, and the content cannot be translated with the other `ui` strings (see the translation PRs).
  - Fix: move the five strings into the `ui` block (and the section heading into the home content) in `src/assets/config.json`, add fields in `site-config.model.ts`, and replace the paragraph with the intended copy. Confirm the intended copy with the owner before merging.
  - Verify: `grep -n "What's Next\|Say Hello\|Simple one-page" src/app/components/home/contact/contact.component.html` returns nothing; `npm test` and `npm run build` pass; the contact section renders the config text in e2e (`e2e/home-sections.spec.ts`).

- [ ] **M-4. Hover preview fires duplicate iframe loads.**
  - Where: `src/app/directives/link-preview/link-preview.service.ts:73-104` (`show()` never clears `hoverIntentTimer` or `iframeTimeoutTimer` before scheduling); `src/app/directives/link-preview/link-preview-delegate.directive.ts:20` (`(mouseover)`, bubbles from every child element) and `:30-41` (calls `show()` on each one).
  - What: moving the pointer across children of one link re-calls `show()`. Each call schedules another `attemptIframe()`, so one hover can set `frame.src` several times. The earlier timers are not cancelled.
  - Why: extra full page loads of third-party sites on every hover, and wasted work. The privacy side of hover loads is already tracked (see below).
  - Fix: in `show()`, clear `hoverIntentTimer` and `iframeTimeoutTimer` before scheduling; or in the delegate, ignore `mouseover` when `relatedTarget` is inside the same link (as `onHide` already does).
  - Verify: a spec for `LinkPreviewService` with a spy on `attemptIframe` (or on the frame's `src` setter) that calls `show()` three times within `HOVER_INTENT_MS` and expects one assignment.

- [ ] **M-5. The live preview iframe contradicts the CSP `frame-src` directive.**
  - Where: `vercel.json:15` (`frame-src 'none'` in `Content-Security-Policy-Report-Only`); `link-preview.service.ts:184-200` (creates an `<iframe>` pointed at arbitrary `https` URLs).
  - What: the CSP is report-only, so nothing is blocked today. Once it is enforced, the live preview will be blocked, and the code relies on load timing to detect that. The earlier security review (`docs/todo/security-review.md`, item 8) describes `frame-src https:`, which no longer matches the header.
  - Why: enforcing the CSP as planned would silently break previews, or the policy would be widened without a decision.
  - Fix: decide the product behaviour first (see the tracked privacy item). If previews stay, add an explicit `frame-src` allow-list for the origins they need, or drop the iframe and keep the card. Then update `docs/todo/security-review.md`.
  - Verify: browse a page with a link preview while the CSP is in enforcing mode and check the console for `frame-src` violations; the header and the doc agree.

- [ ] **M-6. The PR previews deploy uses an unpinned Vercel CLI.**
  - Where: `.github/workflows/pr-previews.yml:156` (`npx --yes vercel@latest deploy ... --prod`).
  - What: the deploy step fetches whatever CLI version is latest at run time. This contradicts the CLAUDE.md tech-currency and pinning rules for tools in workflows. The step runs with a production deploy token (see SEC-1).
  - Why: an unpinned tool that runs with credentials is a supply-chain risk, and the run is not reproducible.
  - Fix: pin an exact version (the latest stable, looked up with `npm view vercel version`), or install it from the lockfile in a pinned step. Keep the detail of how the token is reachable in the private report (see SEC-1).
  - Verify: `grep -n "vercel@" .github/workflows/pr-previews.yml` shows an exact version; `act -n` (dry run) or `actionlint` passes; the next preview deploy succeeds.

## Low

- [ ] **L-1. Twitter meta tags use `property=` instead of `name=`.**
  - Where: `src/index.html:44-49`.
  - What: X/Twitter reads `name="twitter:*"`. With `property=` the card tags are ignored.
  - Fix: change to `name=` on all five tags. Verify with a card validator after deploy.

- [ ] **L-2. npm pinned at 12.2.1; the latest is 12.2.2.**
  - Where: `.github/workflows/build-test.yml:73`, `:124`, `:267`, `:326`.
  - Fix: bump to `npm@12.2.2` in all four places (the `# zizmor:` comment stays). Confirm with `npm view npm version`.

- [ ] **L-3. `@angular/*` versions are out of step.**
  - Where: `package.json:35` (`@angular/core ^22.2.4`), `:40` (`@angular/service-worker` pinned to `22.2.4`); the lockfile has `@angular/ssr`, `@angular/build` and `@angular/cli` at 22.2.5 (latest 22.2.6).
  - Why: CLAUDE.md says the Angular packages move in lockstep; `docs/changes` and `dependabot.yml` both say so.
  - Fix: one PR that updates every `@angular/*` package to the same release (check `npm view @angular/core version` and the others first), using `ng update` where the schematics matter. Major versions stay manual per `dependabot.yml`.
  - Verify: `npm ls @angular/core @angular/ssr @angular/service-worker` shows one version; `npm run build` and `npm test` pass.

- [ ] **L-4. Two dev dependencies are behind their latest minor.**
  - Where: `package.json:58` (`@playwright/test ^1.64.1`, latest 1.65.0), `:57` (`@lhci/cli ^0.15.1`, latest 0.16.0; the high advisories are tracked in `docs/todo/security-review.md`).
  - Fix: update both in the next dependency PR and check the Lighthouse and Playwright configs still run. Check why Dependabot has not opened these, given the 7-day cooldown.
  - Verify: `npm outdated` shows no minor gaps; `npm run test:e2e` and `npm run test:perf` run.

- [ ] **L-5. The lockfile has an older `@vercel/speed-insights`.**
  - Where: `package-lock.json` (`node_modules/@vercel/speed-insights` 2.0.0); latest 2.1.0 is in range for `^2.0.0`.
  - Fix: `npm update @vercel/speed-insights` and commit the lockfile.
  - Verify: `npm ls @vercel/speed-insights` shows 2.1.0.

- [ ] **L-6. TypeScript is pinned to 6.x on purpose; 7.x is available.**
  - Where: `package.json` (`typescript ~6.0.3`); `.github/dependabot.yml:98-101` ignores TypeScript minor and major updates.
  - Fix: no change required now. Decide whether to move to TypeScript 7 once Angular 22 supports it; the ignore rule is the right place for that decision.

- [ ] **L-7. Build, Lighthouse and e2e jobs run on Node 24, not the current LTS.**
  - Where: `.github/workflows/build-test.yml:109`, `:260`, `:319` (`node-version: 24.x`). The unit-test job already runs both 24.x and 26.x.
  - What: the current LTS is 26.13.0 (`https://nodejs.org/dist/index.json`).
  - Fix: switch the build, Lighthouse and e2e jobs to `26.x` (and `pr-previews.yml` if it needs it). Note that Vercel's build runtime should match; check the Vercel project's Node setting first.
  - Verify: the build-test workflow passes on the new Node version.

- [ ] **L-8. The web app manifest has only an SVG icon and a different theme colour.**
  - Where: `src/manifest.webmanifest:4` (`theme_color` `#ff8b00`), `:9-14` (icons: a single SVG). `src/index.html:69` uses `#131f31`, and `ThemeService` `NAVY_BY_MODE.default` is `#131f31`.
  - Fix: add 192 px and 512 px PNG icons (`purpose: "any"` and `"maskable"` as appropriate) to `public`/`src/assets`, and make `theme_color` match the default mode.
  - Verify: Chrome DevTools > Application > Manifest shows no warnings; the install prompt appears.

- [ ] **L-9. A dead environment file with a Universal Analytics placeholder.**
  - Where: `src/enviroment/enviroment.ts:1-4` (`trackAnalyticID: "UA-XXXXXXXXX-X"`). Nothing imports it.
  - Fix: delete the file (the directory name is misspelled, which suggests it is a leftover). Confirm with `grep -rn enviroment src`.
  - Verify: `npm run build` succeeds.

- [ ] **L-10. Linkified links omit `noreferrer`.**
  - Where: `src/app/pipes/linkify/linkify.pipe.ts:24` (`rel="noopener"`). Other external links in the app use `rel="noopener noreferrer"` (`workhistory.component.html:89,93`, `footer.component.html`).
  - Fix: use `rel="noopener noreferrer"` for consistency; update `linkify.pipe.spec.ts:32,40,41` to match.
  - Verify: `npm test` passes.

- [ ] **L-11. Resume download opens a window without `noopener`.**
  - Where: `src/app/services/resume/resume.service.ts:35` (`window.open(..., "_blank")`).
  - Fix: pass `"noopener"` in the window features argument (keep the call synchronous inside the click handler, as the comment there requires). The resume is same-origin, so the risk is low.
  - Verify: `npm test` passes; the resume still opens from the header.

- [ ] **L-12. A focusable non-interactive element with no role or keyboard handling.**
  - Where: `src/app/components/other/aardeyamz/namecard/namecard.component.html:12` (`<div class="namecard-item" tabindex="0">`).
  - Fix: either make it a real control (`<button>` with `aria-expanded`, if it expands) or remove `tabindex`. Check the accordion behaviour first.
  - Verify: keyboard-only walk-through; axe or the planned `accessibility.spec.ts` (see `docs/todo/playwright-e2e-testing-plan.md`) reports no issue.

- [ ] **L-13. The analytics-ID error message is misleading when the variable is blank.**
  - Where: `scripts/inject-env.js:66-72`. When `GOOGLE_ANALYTICS_ID` is set but empty, `source` is truthy and the message says the variable "is not set" for both names.
  - Fix: distinguish "unset" from "set but empty" in the message. Add a case to `scripts/inject-env.test.js`.
  - Verify: `npm run test:scripts` passes with the new case.

- [ ] **L-14. The resume manifest generator has no test.**
  - Where: `scripts/generate-resume-manifest.js` (not covered by `scripts/*.test.js`). Two resumes with the same date would pick one arbitrarily.
  - Fix: add `scripts/generate-resume-manifest.test.js` covering: newest date wins; no match gives `null`; a non-matching name is ignored. Decide what to do for two files with the same date (fail or sort by name) and test it.
  - Verify: `npm run test:scripts` passes.

Additional Low items found in the same pass, numbered for tracking:

- [ ] **L-15. Dev server leaves the analytics placeholder in the page.** `src/index.html:15,21` contain `%GOOGLE_ANALYTICS_ID%`, which only `scripts/inject-env.js` (postbuild) replaces. Under `npm start` the literal string is requested from `googletagmanager.com`. Fix: have the dev path substitute the inert placeholder, or document that dev requests are expected. Verify in `npm start` network logs.
- [ ] **L-16. Karma logs a jasmine-core ESM deprecation.** Output in `npm test` reads "jasmine-core isn't an ES module but it was loaded as one". Fix: configure Karma's `jasmine` framework loading per the jasmine-core 7 notes, then confirm the warning is gone. Verify: `npm test` output has no `DEPRECATION` line.
- [ ] **L-17. Docs drift on the CSP.** `docs/todo/security-review.md` (item 8) describes `frame-src https:`, but `vercel.json:15` has `frame-src 'none'`. Fix: update the doc once M-5 is decided. Verify: the doc and header agree.
- [ ] **L-18. Resume PDFs are cached as immutable for a year at a fixed path.** `vercel.json:25-28` sets `immutable` on `/assets/resume/*`. Files are named by date so a new resume gets a new URL, but replacing a file under the same name would keep serving the old one for a year. Fix: either keep the date-in-name rule and document it in `CLAUDE.md`, or use a shorter `max-age` for `resume/`. Verify: `curl -I` on the resume URL shows the chosen cache policy.

## Tracked elsewhere

These are real but already covered by a document or an open PR. Do not re-open them here; follow the linked item.

| Item | Where tracked |
|---|---|
| Dependabot auto-merge has no real gate; branch protection on `main` is absent (API returns 404 today) | `docs/todo/security-review.md` High 1; `docs/todo/README.md` queue item 1 |
| CSP is report-only with no report endpoint; `'unsafe-inline'` in `script-src` | `docs/todo/security-review.md` Medium 2 |
| 9 high npm advisories, all in the `@lhci/cli` dev chain | `docs/todo/security-review.md` Medium 3 |
| Vercel build-log lines posted to PR comments | `docs/todo/security-review.md` Medium 4 |
| Live link preview loads arbitrary sites on hover (privacy) | `docs/todo/security-review.md` second pass, item 1 |
| `src/server.ts` unused and unhardened | `docs/todo/security-review.md` second pass, item 3 |
| `CLAUDE.md` says `resume-manifest.json` is gitignored; it is tracked | `docs/todo/security-review.md` second pass, item 2 |
| Scroll performance and header cleanups | `docs/todo/code-review-optimization.md` #5; PR #109 |
| Translation editions (`hreflang` and per-language content) | PRs #178, #183, #187, #188, #191 |
| Mermaid lint | PR #166 |

## Checked, no finding

- All nine `uses:` references are pinned to a full commit SHA, and each SHA resolves to the tag in its comment (checked against the GitHub API). Each is at its latest release.
- `permissions:` blocks are read-only by default in `build-test.yml`, `security.yml` and `release.yml`.
- `src/` has no `TODO`, `FIXME`, `HACK` or `XXX` markers.
- `linkify.pipe.ts` escapes text and URLs before bypassing the sanitiser; no XSS path found.
- The app's `innerHTML` bindings take config-owned or registry-owned markup, not user input.
- The `inject-env.js` placeholder never falls back to a real analytics ID.
