# Contributing

Thanks for taking a look. This is a personal portfolio site, so changes are best kept small and focused. Bug fixes, accessibility and performance improvements, and typo fixes are welcome; for a larger change or a new feature, open an issue first. The full conventions are in [`CLAUDE.md`](CLAUDE.md), and [`README.md`](README.md) covers the stack, architecture and CI.

The site's content, name, photos and résumé are mine and are not part of what the [MIT license](LICENSE) invites you to reuse as your own. Please don't submit changes that swap them out.

## Set up

You need [Node.js](https://nodejs.org/) 24 or 26 (CI runs both).

```bash
npm install
npm start        # dev server at http://localhost:4200
```

## Making a change

1. Branch from the latest `main` (a separate git worktree is easiest). Merge `main` in again before you push.
2. Make the change. Read the matching rules in `CLAUDE.md` first, especially for routes, SSR and hydration, styling and `config.json`.
3. Verify it:
   ```bash
   npm test -- --watch=false --browsers=ChromeHeadless
   npm run build
   npm run test:e2e
   ```
4. Update `README.md` and `CLAUDE.md` if you changed commands, architecture or conventions. For a substantial change, add a write-up under `docs/changes/` following the naming rule in `CLAUDE.md`.
5. Open a PR using the template. Say what you actually ran and what you could not verify. Before/after screenshots help for anything visual.

## Dependencies

Dependabot opens the update PRs; please don't bump versions by hand in an unrelated change. See "Dependency security" in the README.

## Reporting problems

Open an issue for a bug. For a security problem, follow [`SECURITY.md`](SECURITY.md) instead of opening a public issue.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
