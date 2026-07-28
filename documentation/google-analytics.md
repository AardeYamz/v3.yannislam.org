# Google Analytics (gtag.js)

The site is tracked with Google Analytics 4 via the global site tag (`gtag.js`). The measurement ID is **not hardcoded** — it's injected at build time from a Vercel Environment Variable.

- **Env var:** `GOOGLE_ANALYTICS_ID` (set in the Vercel project dashboard, per environment — Production/Preview/Development can each have their own value)
- **Fallback:** `G-E3T7KDSRKW`, used only when the env var is unset (e.g. a local `npm run build` without it configured)
- **Template file:** [`src/index.html`](../src/index.html) — contains the `%GOOGLE_ANALYTICS_ID%` placeholder, first thing in `<head>` after `<meta charset>`
- **Injection script:** [`scripts/inject-env.js`](../scripts/inject-env.js) — runs as the npm `postbuild` step (see `package.json`) and rewrites `%GOOGLE_ANALYTICS_ID%` in the **built** `dist/v3.yannislam.org/browser/index.html` with the real value
- **Vercel config:** [`vercel.json`](../vercel.json) — pins `buildCommand` to `npm run build` (so the `postbuild` hook actually runs) and `outputDirectory` to `dist/v3.yannislam.org/browser`

## How it works

1. `src/index.html` ships with `%GOOGLE_ANALYTICS_ID%` instead of a literal ID.
2. `npm run build` runs `ng build`, then npm's lifecycle automatically fires `postbuild` → `node scripts/inject-env.js`.
3. That script reads `process.env.GOOGLE_ANALYTICS_ID` and replaces every `%GOOGLE_ANALYTICS_ID%` occurrence in the built `index.html` in place.
4. On Vercel, `GOOGLE_ANALYTICS_ID` is read from the project's configured Environment Variables at build time — no code change or redeploy-from-git needed to rotate the ID, just update the dashboard value and redeploy.
5. Locally, if the var isn't set, the script falls back to the current production ID and prints a warning, so `npm run build` still produces a working build.

## Adding/rotating the ID

In Vercel: **Project → Settings → Environment Variables** → add/edit `GOOGLE_ANALYTICS_ID` for the relevant environment(s), then redeploy.

## Notes

- This is a static tag, not the Angular-router-aware version — it fires a pageview on initial load only. Since this is an Angular SPA, `gtag('config', ...)` does **not** automatically log a new pageview on client-side route changes.
- If per-route pageview tracking is needed later, either:
  - Call `gtag('config', 'G-XXXXXXX', { send_page_view: false })` and manually send `gtag('event', 'page_view', { page_path: ... })` on each Angular `Router` `NavigationEnd` event, or
  - Use the already-installed but currently unused `ngx-google-analytics` package, which handles this automatically.
- `src/enviroment/enviroment.ts` also has a `googleAnalyticsID` field, but it isn't referenced anywhere in `src/app` — it predates this setup and is unrelated to the mechanism described here.
