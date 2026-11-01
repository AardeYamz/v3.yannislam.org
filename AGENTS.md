# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot, Cursor, …) working in this repo. [`CLAUDE.md`](CLAUDE.md) is the full rulebook and wins on any conflict; read it and [`README.md`](README.md) first.

## What this is

The source of [yannislam.org](https://yannislam.org): an Angular 22 portfolio site (standalone components, signals, zoneless change detection), prerendered to static HTML and served by Vercel. Nearly all page copy lives in `src/assets/config.json`.

## Commands

```bash
npm install
npm start                                            # dev server at http://localhost:4200
npm test -- --watch=false --browsers=ChromeHeadless  # unit tests, single run (as CI does)
npm run build                                        # prerender every route
npm run test:e2e                                     # Playwright
```

Verify a change with `npm test`, `npm run build` and `npm run test:e2e`.

## Rules that bite

- Never import `config.json` in a component; inject `SiteConfigService`, and update `site-config.model.ts` for any new field.
- A new route goes in both `app.routes.ts` and `app.routes.server.ts`.
- Every route is prerendered: keep browser APIs (`window`, `document`, observers) behind `isPlatformBrowser`.
- Zoneless: state written outside a template event must be a signal, or be followed by `markForCheck()`.
- Colour tokens come from the shared [yl-theme](https://github.com/AardeYamz/yl-theme) project, not this repo. Use `var(...)`; to change a token, change it there, then run `node scripts/fetch-theme.js --bump` and commit `theme.json`.
- A new third-party script, frame, image host or connection must be added to the CSP in `vercel.json`.
- Never put a real Google Analytics measurement ID in the repo as a fallback.
- Commit a new resume PDF together with the regenerated `src/assets/resume-manifest.json`.
- Update `README.md` and `CLAUDE.md` in the same PR when a change affects commands, architecture or conventions. Substantial changes get a write-up in `docs/changes/` (naming rule in `CLAUDE.md`).
- Keep the long explanatory comments in the code, and update them when the behaviour changes.
- Work in a separate git worktree off `origin/main`, merge `main` in before pushing, and keep PRs small. Fill in the PR template.
