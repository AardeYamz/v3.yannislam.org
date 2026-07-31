# SEO fixes: robots.txt, sitemap.xml, social card image

## Context

Three independent SEO gaps in the site:

1. No `robots.txt` or `sitemap.xml` at all, so crawlers had no explicit
   crawl policy and no discoverable list of routes.
2. `og:image`/`twitter:image` in `src/index.html` pointed at
   `src/assets/images/profiles/profile4.jpg`, a 3.6MB full-resolution
   portrait (2671x3562) straight off a camera — far larger than a social
   card needs, and the wrong aspect ratio (portrait, not the ~1.91:1 that
   Open Graph/Twitter cards render at). A separate, unrelated PR is already
   compressing `profile4.jpg` itself for general on-page use, so this work
   does not touch that file — it derives a new, purpose-built image instead.
3. Spot-check the other meta tags (`title`, `description`, `canonical`)
   alongside these changes.

## robots.txt / sitemap.xml

New `src/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://yannislam.org/sitemap.xml
```

New `src/sitemap.xml` lists the site's real routes, taken from
`src/app/app-routing.module.ts` (the wildcard `**` route redirects to `/`
and isn't a distinct page, so it's excluded):

- `https://yannislam.org/`
- `https://yannislam.org/projects`
- `https://yannislam.org/projects/highschool`
- `https://yannislam.org/aardeyamz`

Both are plain static files with no Angular templating needs, so they're
wired into `angular.json`'s build `assets` array the same way
`favicon.ico`/`manifest.webmanifest` already are — copied verbatim to the
build output root:

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/manifest.webmanifest",
  "src/robots.txt",
  "src/sitemap.xml"
]
```

Confirmed both land at `dist/v3.yannislam.org/browser/robots.txt` and
`.../sitemap.xml` after `ng build`.

If new routes are added to `app-routing.module.ts` in the future,
`src/sitemap.xml` needs a matching manual update — nothing generates it
automatically.

## Social card image

`profile4.jpg` is also the photo used in `about.component.html`, so it's
the natural source for a cropped social-card derivative — keeping the same
"who is this" identity as the rest of the page, just reframed for a social
card. Rather than editing that file (owned by the other in-flight
compression PR), a new file is generated from it:

- `npm install --no-save sharp` (dev-only, not added to `package.json` —
  it's a one-off image processing step, not a runtime or build
  dependency).
- Cropped/resized with `sharp`'s `cover` fit and `attention`-strategy
  gravity (auto-detects the highest-saliency region — here, the face —
  rather than a plain center crop, since the source is a tall portrait
  being fit into a wide card) to exactly **1200x630**, encoded as JPEG at
  **quality 80**.
- Saved as new file `src/assets/images/profiles/social-card.jpg` —
  **116,067 bytes (~113 KB)**, vs. the original `profile4.jpg` source at
  3.6MB. `profile4.jpg` itself is untouched.

`src/index.html`'s `og:image` and `twitter:image` now both point at:
```
https://yannislam.org/assets/images/profiles/social-card.jpg
```
(previously both pointed at `.../profile4.jpg`). No new build wiring
needed — `src/assets` was already a build asset root, so the new file
under it is picked up automatically.

## Other meta tags

`title`, `meta name="description"`, and `link rel="canonical"` in
`src/index.html` were reviewed and left unchanged — they already
accurately describe the site and canonical URL (`https://yannislam.org`)
and aren't affected by the sitemap/robots/image changes above.

## Files touched

- `src/robots.txt` — new.
- `src/sitemap.xml` — new.
- `angular.json` — build `assets` array, two new entries.
- `src/assets/images/profiles/social-card.jpg` — new, generated from
  `profile4.jpg` via `sharp` (not committed as a dependency).
- `src/index.html` — `og:image`/`twitter:image` now point at
  `social-card.jpg` instead of `profile4.jpg`.

## Verification

- `npx ng build` (production configuration) completes with no errors —
  only a pre-existing, unrelated component-style budget warning
  (`header.component.scss`, 500 bytes over its 5kB budget).
- `dist/v3.yannislam.org/browser/` inspected directly after the build:
  `robots.txt`, `sitemap.xml`, and
  `assets/images/profiles/social-card.jpg` all present at the expected
  paths, alongside the untouched `profile4.jpg`.
- `social-card.jpg` confirmed via `file` as JPEG, 1200x630, and via `ls`
  as 116,067 bytes.
