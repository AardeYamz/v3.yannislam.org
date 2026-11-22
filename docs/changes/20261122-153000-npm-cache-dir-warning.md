# Silence the npm "cache-dir" warning on Vercel builds

Date: 2026-11-22 15:30:00

Vercel's build sets `npm_config_cache_dir` (with an underscore) to point npm at
its restored package cache. npm reads that as an unknown config key `cache-dir`
and warns that it will stop working in the next major version (issue #238).
`installCommand` and `buildCommand` now copy the value to `npm_config_cache`,
npm's real setting, and unset the unknown one, so the cache is still used and
the warning goes away. Found by listing env var names in a preview build.
