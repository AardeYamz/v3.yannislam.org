Date: 2026-08-17 01:32:59

# Fix Braintree Public Schools Logo Console Error

## Root cause

`config.json`'s `logos.braintreePS.src` hotlinked a Facebook CDN URL
(`scontent-bos5-1.xx.fbcdn.net/...`) with a signed, expiring query string
(`oh=`/`oe=` tokens). Facebook CDN URLs like this are per-request,
time-limited signatures, not stable public asset links — the URL had
already expired, so every page load fired a real network request that
came back `403 (Forbidden)` and logged a `GET .../scontent-bos5-1.../...
403 (Forbidden)` error to the console.

This was already flagged as a known issue in
`docs/todo/github-actions-speed-and-hardening.md` §6.3 ("a Facebook CDN
URL with what looks like an expiring signed query string") and tracked as
part of the broader, deliberately-deferred §6.5 follow-up to self-host all
11 hotlinked `logos` entries. That larger migration is still open; this
change only fixes the one entry that was actively erroring in production.

## Fix

Changed `logos.braintreePS.src` from the dead Facebook CDN URL to
`"data:,"` — the same convention already used by the `cbcgb` entry
(`config.json`) for organizations without a hotlinkable logo. `data:,` is
an empty, invalid data URI: the `<img>` fails synchronously with no
network request at all, immediately firing `LogoFallbackDirective`'s
`error` handler, which renders the existing generated placeholder
(org-name SVG data URI, recolored on theme change).

Net effect: same placeholder that was already showing (the real image
was already failing), but with zero network request and zero console
error instead of a `403`.

## Other console noise investigated, not from this repo

Most of the console output reported alongside this (`content.js`,
`contentscript.js`, extension-bundled `sentry.js`, `container.js`,
`detectCompetitors.js`, `autocomplete.js`, `ObjectMultiplex` /
`MaxListenersExceededWarning` messages, and the `trykudos.github.io`
requests) are injected by a browser extension (its own webpack bundle and
allowlist-fetch logic), not by this site — they don't reference any file
in this repo and would appear on any site with that extension enabled.

The Vercel Web Analytics / Speed Insights script failures
(`_vercel/insights/script.js`, `_vercel/speed-insights/script.js`
`ERR_BLOCKED_BY_CLIENT`) and the Cloudflare Insights beacon failure are
expected, by-design no-ops per
`docs/changes/20260731-184800-vercel-analytics-6.md` — they only
`console.log` (never `console.error`/throw) and are triggered by
ad-blockers or content blockers intercepting the request client-side, not
by a bug in the app.

## Updated: pinned to Braintree Public Schools' live Facebook profile picture

Requested as a follow-up: instead of the `data:,` placeholder, always show
whatever Braintree Public Schools' Facebook Page (`facebook.com/BraintreeEDU`)
currently has as its profile picture.

Changed `logos.braintreePS.src` to
`https://graph.facebook.com/BraintreeEDU/picture?width=720&height=720`
(`width`/`height` requests a larger image than the biggest named `type`
bucket, `large`, capped by the source photo's actual resolution). This is
Facebook's public Graph API picture endpoint — unlike the original
`scontent-bos5-1.xx.fbcdn.net` CDN link, it takes a stable Page
username/ID rather than a signed, expiring token, and 302-redirects to
whatever the Page's current profile picture is on every request. No app
code changes needed: it's a normal `<img src>`, so it updates automatically
whenever the Page's picture changes, with no build step or manual
maintenance.

Trade-off, noted deliberately rather than overlooked: this reintroduces a
live external request on every page load — the same category of risk
(rate limiting, referrer/CORS policy changes, Facebook blocking automated
access) that motivated switching away from a hotlink in the first place.
`LogoFallbackDirective`'s existing `error` handler still covers the failure
case, so a blocked or failing request falls back to the generated
placeholder exactly as before — but a failure will still log a console
error, same as the original bug. This was a deliberate choice over the
alternative (a scheduled GitHub Action that self-hosts a periodic snapshot
of the picture, matching the deferred §6.5 self-hosting plan) in favor of
staying current with zero added infrastructure.
