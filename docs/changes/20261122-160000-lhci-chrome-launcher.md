# Lighthouse CI: use chrome-launcher 1.x

Date: 2026-11-22 16:00:00

`@lhci/cli` 0.16.1 pins `chrome-launcher@^0.13.4`, which is where the
`rimraf@3`, `inflight` and `glob@7` deprecation warnings came from besides
Karma. An override moves it to `^1.2.3`, the version Lighthouse 13 already
uses. `chrome-launcher` 1.x is ESM-only; `@lhci/cli` loads it with `require`,
which Node 24 and 26 support. The `lighthouse` CI job exercises it. The
remaining warnings go with the Vitest move (#243) and the `@angular/animations`
removal (#237).
