# Diagnose the npm "cache-dir" warning on Vercel builds

Date: 2026-11-22 15:30:00

Temporary `installCommand` that prints the names (never the values) of
cache and npm_config environment variables in the Vercel build, to find what
sets `cache-dir` (issue #238). Replaced by the real fix once the name is known.
