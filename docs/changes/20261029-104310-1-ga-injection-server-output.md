Date: 2026-10-29 10:43:10

# inject-env: Substitute The GA Placeholder In The SSR Output Too

## Why

`scripts/inject-env.js` already walked every `*.html` file under
`dist/v3.yannislam.org/browser/`, which fixed GA on direct loads of the
prerendered routes. A follow-up check of the whole build output showed the
literal `%GOOGLE_ANALYTICS_ID%` still present in the server output:

```
dist/v3.yannislam.org/server/index.server.html
dist/v3.yannislam.org/server/assets-chunks/{index,index_csr,projects_index,
  projects_highschool_index,aardeyamz_index,index_server}_html.mjs
```

Vercel serves `browser/` statically today, so this is not a live bug, but
those `.mjs` chunks are the HTML templates an SSR/prerender-on-demand host
would render — it would ship the unsubstituted placeholder and GA would
report nowhere.

## What Changed

- `findHtmlFiles(dir)` became `findFiles(dir, extensions)`, and the script
  now patches `*.html` under `browser/` (still required) plus `*.html` and
  `*.mjs` under `server/` when that directory exists (`outputMode` could
  become `static` in the future).
- The success log counts files rather than HTML files.
- Fail-closed behavior, env aliases and the inert placeholder are unchanged.

## Verification

- `npm run build`: `[inject-env] Injected environment values into 28 file(s)`.
- `grep -rl '%GOOGLE_ANALYTICS_ID%' dist/` returns nothing (before this
  change it listed the 7 server files above).
- A deploy build without `GOOGLE_ANALYTICS_ID` still warns and substitutes
  `G-XXXXXXXXXX` locally; with `VERCEL=1` it still fails the build.
