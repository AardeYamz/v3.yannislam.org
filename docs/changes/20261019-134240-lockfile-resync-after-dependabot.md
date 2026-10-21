Date: 2026-10-19 13:42:40

# Lockfile Resync After Dependabot Group Bumps

## Problem

After the Dependabot group bumps in #133 and #135, `npm ci` fails on `main`
with `Missing: ... from lock file` (e.g. `pac-resolver`, `quickjs-wasi`,
`degenerator`, `data-uri-to-buffer`). Dependabot rewrote the top-level entries
but dropped nested/optional ones, so `package-lock.json` no longer satisfies
`package.json`. CI runs against each PR merged with `main`, so `build` and
`unit-tests` fail on every open PR regardless of its own diff. Same failure
mode as #106.

## Fix

Regenerated with `npm install --package-lock-only` (not hand-edited). `npm ci`,
`npm run build` and `npm test` pass afterwards. Lockfile-only change.
