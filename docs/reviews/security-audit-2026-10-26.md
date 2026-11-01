# Security Review — v3.yannislam.org

**Date:** 2026-10-26
**Scope:** entire repository (Angular 22 client, prerender/SSR plumbing, build scripts, `vercel.json`, `.github/workflows`, dependency tree)
**Method:** static review of every first-party source file plus script/config files, targeted pattern searches for injection sinks, `npm audit` against the committed lockfile, and inspection of the deployed-artifact configuration. **No live/runtime testing was performed** (no DAST, no authenticated scanning, no browser exploitation attempts).
**Status:** read-only review — this document changes no code.

## Summary

This is a static, content-driven portfolio site with **no user input, no authentication, no server-side data handling, and no API surface**. That removes entire vulnerability classes (SQLi, auth bypass, IDOR, SSRF, server-side template injection, file upload). The realistic risk here is concentrated in three places: **what the browser is allowed to do if something goes wrong (CSP)**, **the supply chain** (third-party script, third-party images, dependency updates), and **repository hygiene around credential files**.

Nothing found is remotely exploitable today. Two items are worth fixing this week because the fixes are small and the downside is low.

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 1 | No `Content-Security-Policy` (or `Cross-Origin-Opener-Policy`) on any response | **Medium** | ~1 h |
| 2 | `.gitignore` has no `.env*` / `.vercel/` rules — credentials protected only by a local-only exclude | **Medium** (latent) | 5 min |
| 3 | 9 high-severity advisories in the dev-only Lighthouse toolchain | Low | ~1 h |
| 4 | Hover-preview iframes load arbitrary linked pages (`sandbox="allow-scripts"`) | Low | — (accept/annotate) |
| 5 | `config.json` is an HTML trust boundary (3 sanitizer bypasses + 1 raw `[innerHTML]`) | Low | test-only |
| 6 | Logo-fallback SVG is not XML/URI-escaped for `'`, `"`, `#` | Low | 15 min |
| 7 | GA4 loads unconditionally; missing env var silently falls back to a hardcoded live ID | Low (compliance) | ~1 h |
| 8 | Dependabot auto-merges minor/patch bumps of production dependencies | Low (supply chain) | 10 min |

## Findings

### 1. No Content-Security-Policy — Medium

[vercel.json](../../vercel.json#L6-L18) sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and a 2-year HSTS with `preload`. That is a good baseline (and better than most personal sites), but there is **no `Content-Security-Policy`** and no `Cross-Origin-Opener-Policy`.

Why it matters: the page's security currently rests entirely on *"no injection will ever happen"*. Two things make that assumption load-bearing rather than trivial:

- A third-party script (`googletagmanager.com/gtag/js`) runs with full page privileges. If that origin is compromised or a malicious version is served, nothing constrains what it can do — it can read the DOM, exfiltrate to any host, or inject further script.
- `LinkPreviewService` frames arbitrary third-party documents ([link-preview.service.ts:150](../../src/app/directives/link-preview/link-preview.service.ts#L150)) — sandboxed, but a CSP `frame-src` would bound the set of hosts a config edit can point at.

A CSP would not have prevented any bug found in this review; its value is limiting the blast radius of the *next* one (a future `innerHTML` mistake, a hijacked dependency, a compromised npm package).

Suggested header, added to the `/(.*)` block in [vercel.json](../../vercel.json#L5):

```
default-src 'self';
script-src 'self' https://www.googletagmanager.com 'sha256-<hash of the inline gtag bootstrap>';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com;
frame-src https:;
frame-ancestors 'none';
base-uri 'self';
form-action 'none';
object-src 'none';
upgrade-insecure-requests
```

Practical notes for this codebase:

- `style-src 'unsafe-inline'` is required (Angular injects component styles as inline `<style>`; [icon.component.ts](../../src/app/icons/icon.component.ts#L16-L33) also uses `::ng-deep`-scoped component CSS). Tightening that means `ngCspNonce` + `CSP_NONCE`, which is a bigger change than it's worth here.
- `script-src` must allow the inline gtag bootstrap at [index.html](../../src/index.html#L14-L20). Either hash it (it is stable text, but `%GOOGLE_ANALYTICS_ID%` is substituted *after* the build, so the hash has to be computed post-substitution in [scripts/inject-env.js](../../scripts/inject-env.js) or the inline block moved to a static same-origin `.js` file — the simpler option) or, temporarily, `'unsafe-inline'` for scripts, which costs most of the XSS benefit.
- `frame-src https:` keeps the link-preview feature working; it is deliberate, not an oversight.
- Roll it out with `Content-Security-Policy-Report-Only` first and watch for violations from the carousel/animation code before enforcing.
- Adding `Cross-Origin-Opener-Policy: same-origin` is safe here (no cross-origin popups are opened; [resume.service.ts:35](../../src/app/services/resume/resume.service.ts#L35) opens a same-origin PDF) and costs nothing.

### 2. `.gitignore` does not ignore `.env*` or `.vercel/` — Medium (latent)

Verified:

```
$ git check-ignore -v .env.local
.git/info/exclude:19:.env.local    .env.local
$ git ls-files | grep -iE '\.env|^\.vercel'
(no results)
```

Nothing credential-bearing is committed today (a pattern scan across all tracked files for `api_key|secret|token|password = "..."` returned nothing). But the protection comes from **`.git/info/exclude`, which is per-clone and not versioned** — the repository's own [.gitignore](../../.gitignore) has no `.env*` and no `.vercel/` rule.

Why it matters: the documented workflow uses the Vercel CLI, which writes `.env.local` containing a `VERCEL_OIDC_TOKEN` (present in this working tree right now) and `.vercel/project.json` holding the org/project IDs. OIDC tokens are short-lived, but any contributor who also keeps a plain `.env` with a real API key in the project root is one `git add -A` away from committing it, and CI checkouts / fresh clones get no protection at all.

Fix — append to [.gitignore](../../.gitignore):

```gitignore
# Local environment / Vercel CLI state
.env
.env.*
!.env.example
.vercel
```

Then `git rm --cached` anything that becomes tracked (nothing is, currently) and keep the existing `.git/info/exclude` entries as defence in depth.

### 3. Nine high-severity advisories in the dev toolchain — Low

`npm audit --package-lock-only` against the committed [package-lock.json](../../package-lock.json):

```
basic-ftp  <=6.2.0   (GHSA-c475-qrg2-pj4r — quadratic-time CPU DoS in Client.list())
  ← get-uri ← pac-proxy-agent ← proxy-agent ← @lhci/cli
                                             ← lighthouse ← @lhci/utils
                                             ← puppeteer-core ← @puppeteer/browsers
9 high severity vulnerabilities
```

Assessment: **not shipped to users.** This chain sits under `@lhci/cli`, a devDependency used only by `npm run test:perf`. It never enters the browser bundle, the prerendered output served by Vercel, or CI's test job (`.github/workflows/build-test.yml` doesn't run Lighthouse; only `npm test` and `npm run build`). The realistic exposure is a developer or CI job running `lhci autorun` against a malicious FTP URL — not a scenario this repo creates.

`npm audit fix --force` would downgrade `@lhci/cli` to 0.13.0, a breaking change, so it is not worth taking blindly.

Suggested handling (pick one):
- Re-check after the next `@lhci/cli` / `lighthouse` release; the advisory is in a transitive dependency of `proxy-agent`, so upstream is likely to move first.
- Add an `overrides` entry pinning `basic-ftp` to `>6.2.0` (this repo already uses `overrides` in [package.json](../../package.json#L61-L76) for exactly this kind of pin — consistent with existing convention).
- If neither lands soon, note it in the Dependabot/Aikido triage rather than carrying it as an unresolved "high" in every future scan.

### 4. Hover previews load third-party pages in a sandboxed iframe — Low

[link-preview.service.ts:150](../../src/app/directives/link-preview/link-preview.service.ts#L150) sets `frame.src` to a URL taken from `config.json`, after a `frame.onload` timing heuristic decides whether to reveal it.

What's already right (reviewed in detail, no change needed):

- URL gate is `^https?://` ([link-preview-card.ts:12](../../src/app/directives/link-preview/link-preview-card.ts#L12)), which excludes `javascript:`, `data:` and `blob:`.
- `sandbox="allow-scripts"` **without** `allow-same-origin` ([link-preview.service.ts:200](../../src/app/directives/link-preview/link-preview.service.ts#L200)) — the framed page gets an opaque origin, so it can't read cookies, `localStorage`, or the parent DOM.
- No `allow-top-navigation*`/`allow-popups` tokens, so a framed page cannot navigate the tab away.
- `referrerpolicy="no-referrer"` ([link-preview.service.ts:191](../../src/app/directives/link-preview/link-preview.service.ts#L191)) — the visited site doesn't learn where the visitor came from.

Residual concerns, both accepted risks rather than bugs:

- **Privacy:** merely hovering a link causes the visitor's browser to make a full request to that host — IP address, User-Agent, and TLS fingerprint are disclosed without a click, and any tracking pixels/analytics on that page run. `no-referrer` limits this to "someone visited", not "someone visited from yannislam.org".
- **Attack surface:** with `allow-scripts`, the framed document renders arbitrary third-party JS in the visitor's browser (in an opaque origin). Worth keeping only because the URL set is author-controlled.

If you want to reduce it: drop `allow-scripts` (many sites then render blank, so the card falls back to icon/title/domain — arguably fine for a tooltip), or add the `csp` attribute to the iframe (`csp="default-src 'none'; style-src 'unsafe-inline'; img-src data:"`) to strip scripts, fonts and network access from the preview entirely. Either is a UX tradeoff, not a security necessity.

### 5. `config.json` is an HTML trust boundary — Low

Four places treat `config.json` content as trusted markup. All are **safe as the code stands**, and all rely on `config.json` being repo-authored. They are worth documenting because they define what happens if content ever moves to a CMS or an external editor.

| Location | Mechanism | Verdict |
|---|---|---|
| [linkify.pipe.ts:27](../../src/app/pipes/linkify/linkify.pipe.ts#L27) | `bypassSecurityTrustHtml` over escape-then-linkified text | **Sound.** `escapeHtml` covers `& < > " '` and every generated anchor uses quoted attributes, so a URL containing `"` cannot break out of `href`; `URL_PATTERN` only matches `https?://`, so `javascript:` can never become an anchor target. |
| [icon.component.ts:48](../../src/app/icons/icon.component.ts#L48) | `bypassSecurityTrustHtml(svgMarkup(name))` | **Sound.** `svgMarkup` builds markup from a fixed registry and returns `''` for unknown keys; the input is only used as a lookup key, never interpolated. |
| [link-preview.service.ts:85](../../src/app/directives/link-preview/link-preview.service.ts#L85) | `iconEl.innerHTML = svgMarkup(data.icon)` | **Sound**, same reason. |
| [banner.component.html:21](../../src/app/components/home/banner/banner.component.html#L21) | `[innerHTML]="text"` (blurb paragraphs) | **Sanitized, not bypassed** — Angular's `DomHtmlSanitizer` strips `<script>` and event handlers. But it *permits* `<a href>`, `<img src>`, `<iframe>` remnants, so a hostile config would still get markup injection and outbound tracking pixels. |

Two concrete follow-ups, both cheap:

1. `LinkifyPipe` is security-sensitive and has tests only for the happy path. Add adversarial cases: `https://a.example/"><script>alert(1)</script>`, `https://a.example/" onmouseover="alert(1)`, `javascript:alert(1)`, `https://a.example/"';alert(1)//`, and a bare `&amp;` to prove double-escaping doesn't corrupt the URL.
2. Keep `config.json` free of secrets. It ships to the browser at `/assets/config.json` as an Angular asset, so "public by definition" — currently it contains nothing sensitive.

### 6. Logo-fallback SVG is under-escaped — Low

[logo-fallback.ts:10-12](../../src/app/directives/logo-fallback/logo-fallback.ts#L10-L12) escapes only `&`, `<`, `>`; the SVG then uses single-quoted attributes and is emitted as `data:image/svg+xml;utf8,${svg}` with no percent-encoding ([logo-fallback.ts:52](../../src/app/directives/logo-fallback/logo-fallback.ts#L52)).

Two failure modes, both cosmetic rather than exploitable:

- An organization name containing `'` breaks out of the surrounding `x='...'` / `fill='...'` attribute quoting, producing malformed SVG (blank logo).
- A `#` in a name truncates the data URI at a fragment, so the placeholder renders truncated.

Not a vulnerability today: the values come from repo-owned `config.json`, and the result is used as an `<img src>` — SVG loaded through `<img>` cannot execute script. Still worth fixing since it is three characters of work:

```ts
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}
// ...
return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
```

Note the inconsistency: `fill` is already `encodeURIComponent(color)`-encoded while the SVG body is not.

### 7. Analytics loads unconditionally, with a live fallback ID — Low (compliance)

[index.html:15](../../src/index.html#L15) loads `gtag.js` and fires `gtag('config', ...)` on first paint, before any consent decision, for every visitor including EU/UK ones. For a site with EU traffic this is a GDPR/ePrivacy exposure (analytics cookies set without a lawful basis), not a technical vulnerability.

Related, and arguably the sharper issue: [inject-env.js](../../scripts/inject-env.js#L19) **falls back to a hardcoded, live measurement ID** (`G-E3T7KDSRKW`) when `GOOGLE_ANALYTICS_ID` is unset or malformed:

```js
{ name: 'GOOGLE_ANALYTICS_ID', env: 'GOOGLE_ANALYTICS_ID', fallback: 'G-E3T7KDSRKW' }
```

The ID *validation* (regex `^G-[A-Z0-9]+$`, quote/whitespace trimming, `GOOGLE_ANALYTICS` alias) is well done, but the fallback means a production build missing the env var silently sends traffic to the original owner's property instead of failing loudly — including for anyone who forks this repo. Suggested: keep the fallback for `ng serve` (where there is no Vercel env), and `process.exit(1)` in a production build (`process.env.VERCEL === '1'`) with the placeholder left unsubstituted.

Also worth noting: `gtag.js` carries no `integrity` attribute. SRI isn't practical for a versionless rolling CDN script, which is exactly why the CSP in finding 1 matters more here than SRI would.

### 8. Dependabot auto-merges production dependency bumps — Low (supply chain)

[dependabot-auto-merge.yml](../../.github/workflows/dependabot-auto-merge.yml) squash-merges any **patch or minor** bump of **any** dependency — including runtime dependencies — once Build & Test and Security pass. Major bumps of dev-only dependencies are also auto-merged.

The compensating controls are real and unusually good for a personal project: every action is SHA-pinned, `permissions: contents: read` by default, `persist-credentials: false`, and [package.json](../../package.json#L40-L45) has an `allowScripts` allowlist so a newly compromised package cannot run an install script unnoticed. But tests passing is not a security review, and a hijacked minor release of a runtime package (`@angular/*`, `express`, `bootstrap`) would reach production without a human looking at it.

Cheap hardening: restrict auto-merge to `direct:development` dependencies (keep manual review for runtime ones), and/or add Dependabot `cooldown:` so a version must be published for a few days before it is proposed — the standard defence against the "compromised release, yanked 6 hours later" pattern.

## Controls verified (no action needed)

- **No user input anywhere.** No forms, no query-parameter parsing, no `postMessage` handlers, no cookies. `localStorage` holds only `yl-theme-mode`, validated against a fixed allowlist before use ([theme.service.ts:74-78](../../src/app/services/theme/theme.service.ts#L74-L78)).
- **No dangerous sinks in application code.** No `eval`, `new Function`, `document.write`, `setTimeout(string)`, or dynamic `<script>` injection. All four `bypassSecurityTrustHtml`/`innerHTML` sites are enumerated and assessed in finding 5.
- **No server-side attack surface in production.** [app.routes.server.ts](../../src/app/app.routes.server.ts) prerenders every route at build time; `vercel.json` serves `dist/v3.yannislam.org/browser` as static files. The Express entry ([server.ts](../../src/server.ts)) is not part of the deployed artifact — if it were ever run, it exposes only `express.static` plus Angular's router, with no custom API routes.
- **No secrets in tracked files.** `git grep` for key/token/password assignments across all tracked files: no hits. GA is injected at build time, and the injection is regex-validated with quote/whitespace normalization — a hostile `GOOGLE_ANALYTICS_ID` cannot break out of the `gtag()` call.
- **`target="_blank"` links are consistently `rel="noopener noreferrer"`** across header, footer, work history, education and projects. The sole exception is the `mailto:` "Say Hello" link in [contact.component.html:17](../../src/app/components/home/contact/contact.component.html#L17), which uses `target="_blank"` without `rel` — harmless (a `mailto:` handoff cannot obtain a window handle), but inconsistent with the rest of the templates.
- **Security headers present:** `X-Frame-Options: DENY` (clickjacking), `nosniff`, HSTS 2y + `includeSubDomains` + `preload`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation.
- **GitHub Actions hardening is already done** (and documented in [docs/todo/github-actions-speed-and-hardening.md](../todo/github-actions-speed-and-hardening.md)): all `uses:` SHA-pinned with version comments, least-privilege `permissions:` per job, `persist-credentials: false`, `npm ci` against the committed lockfile, `npm audit` disabled only to avoid network chatter, and zizmor linting workflows on every PR. I checked all five workflow files for script injection: every attacker-influenceable value (`github.event.*`) is passed through `env:` or `--jq`, never interpolated into `run:` text. The `pull_request_target` job in the auto-merge workflow never checks out PR code.
- **Dev-server host-header protection.** `angular.json` sets `build.security.allowedHosts: []`, so serving on all interfaces cannot be reached through a rebinding DNS name.
- **No source maps in production.** Only the `development` configuration enables `sourceMap`; the `production` configuration (the one Vercel builds with) leaves it off, and `optimization` at its default.
- **Service worker scope is tight.** [ngsw-config.json](../../ngsw-config.json) precaches only same-origin app-shell files and caches `/assets/images|fonts/**`; no cross-origin or API responses are cached, so no cached-token or cache-partitioning concern.
- **`Cache-Control: immutable` is correctly excluded** from `/assets/config.json` and `/assets/resume-manifest.json` (per [docs/changes/20260925-073726-p0-fixes-from-code-review-backlog.md](../changes/20260925-073726-p0-fixes-from-code-review-backlog.md)) — no stale-config or stale-download trap.

## Not covered by this review

- **Runtime/DAST and infrastructure:** TLS configuration, Cloudflare proxy behaviour, Vercel edge headers as actually served (verified only in the `vercel.json` source, not against a live response), DNS/email records for the domain.
- **Third-party code:** Angular 22, Bootstrap 5, ng-bootstrap and the prerender/SSR stack were treated as trusted at their pinned versions beyond what `npm audit` reports. `npm audit` also only knows *published* advisories as of the run date.
- **Git history:** reviewed the working tree and tracked files, not every commit, so a secret committed and later removed in history would not have been caught by the pattern scan.
- **Accessibility-adjacent security** (focus trapping in the mobile drawer, `inert` handling) — behaviour verified by the existing e2e suite, not re-tested here.

## Suggested order of work

1. Add `.env*` / `.vercel` to `.gitignore` (5 minutes, removes a latent credential leak).
2. Ship CSP as `Report-Only`, tighten, then enforce; add `Cross-Origin-Opener-Policy` at the same time.
3. Add the adversarial `LinkifyPipe` tests (they lock in behaviour that currently only holds by inspection).
4. Decide on the analytics questions: consent gate, and fail the production build when `GOOGLE_ANALYTICS_ID` is missing.
5. Fold the `basic-ftp` override and the Dependabot cooldown in whenever `package.json` is next touched.

## Appendix — commands used

```bash
npm audit --package-lock-only --audit-level=low
git ls-files | grep -iE '\.env|^\.vercel|\.pem|\.key'
git check-ignore -v .env.local
git grep -nIE '(api[_-]?key|secret|token|password)\s*[:=]\s*["'\''][A-Za-z0-9_\-]{8,}' -- . ':!package-lock.json'
grep -rn 'innerHTML|bypassSecurityTrust|DomSanitizer|eval\(|new Function|document\.write' src/
node -e "require('./angular.json') …"   # serve/build/security/sourceMap config
```
