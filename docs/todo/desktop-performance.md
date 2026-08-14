# Desktop performance to-do

Analysis of the Vercel Speed Insights desktop numbers (Production, last 7
days) and what in this repo is causing them.

| Metric | Value | Target | Verdict |
| ------ | ----- | ------ | ------- |
| Real Experience Score | 37 | > 90 | Poor |
| First Contentful Paint | 3.17 s | < 1.8 s | Poor |
| Largest Contentful Paint | 3.62 s | < 2.5 s | Poor |
| Cumulative Layout Shift | 0.68 | < 0.1 | Poor — worst offender |
| Time to First Byte | 1.68 s | < 0.8 s | Poor |
| INP / FID | — | | no samples yet |

Caveat on the data: the Routes panel shows **22 samples** on a single
"Unknown" route. A P75 over 22 desktop visits is noisy — one slow cold load
on a bad connection moves it a lot. Treat the numbers as directionally
right (they match what the code does) but re-measure after each batch of
fixes rather than chasing a single delta.

The chain that produces these numbers:

```
TTFB 1.68s ──► download+parse main.js & styles.css ──► Angular boots
   │                                                        │
   │                                        FCP 3.17s ──────┘  (loading
   │                                                            screen SVG
   │                                                            paints)
   └──► nothing at all is on screen for 3.17s, because the first
        pixel of this site is rendered by a component

  then: loading screen holds the viewport for a further ~2.25s while
  the real page reflows underneath it (font swaps, typewriter) — those
  reflows still count toward CLS even though nobody can see them.
```

---

## P0 — CLS 0.68

CLS is by far the worst metric and the cheapest to fix. Everything below is
a genuine layout shift, not a repaint.

- [ ] **Reserve height for the typewriter heading.**
      `src/app/components/home/banner/banner.component.html:13` renders
      `<h3 class="typing">` empty, and `ngx-typed-js` fills it in after
      boot. An empty block box has **zero** height, so the h3 jumps from
      0 → 88px (`font-size: 80px` × `line-height: 1.1`,
      `banner.component.scss:41-46`) the moment the first character types.
      Worse, the banner content is vertically centred
      (`.container { display: table; height: 100vh }` +
      `.section-box-banner { display: table-cell; vertical-align: middle }`,
      `banner.component.scss:7-13`), so that 88px does not just push the
      blurb and buttons down — it re-centres the *entire* banner, moving
      the h1, h2, paragraphs and both CTA buttons at once. Fix: give
      `.typing` an explicit `min-height: 1.1em` (and the same at every
      breakpoint where `h3`'s font-size changes) so the box is full-height
      before a single glyph arrives.

- [ ] **Stop the font swap from reflowing text.** Every face in
      `src/fonts.scss` uses `font-display: swap` with no metric-matched
      fallback. Calibre and SF Mono have different advance widths from the
      system fallbacks in `src/variables.scss:11-12`, so every line of text
      on the page re-lays-out when the woff2 arrives — on an 80px heading
      that is a large visual move. Two options, best applied together:
      1. Declare metric-adjusted fallback faces
         (`@font-face { font-family: 'Calibre Fallback'; src: local('Arial');
         size-adjust: …%; ascent-override: …%; descent-override: …% }`) and
         put them next in the stack ahead of the generic fallbacks. Numbers
         can be generated from the woff2 metrics.
      2. Switch the two above-the-fold faces to `font-display: optional`,
         which makes the browser either use the web font immediately or
         skip it for that load — never swap. Requires the preloads below.

- [ ] **Preload SF Mono Regular.** `src/index.html:56` preloads only
      `Calibre-Semibold.woff2`. But the banner's greeting (`h1`,
      `banner.component.scss:22`) and the header's nav numbers both use
      `$CodeFont` → `SFMono-Regular.woff2` (44 KB), and neither is
      preloaded, so it is discovered only after `styles.css` parses. Add a
      second `<link rel="preload" as="font" crossorigin>` for it. Also
      preload `Calibre-Regular.woff2` — it is what the body copy uses.

- [ ] **Do not toggle `body { overflow }` for the loading screen.**
      `loading-screen.component.ts:44` sets `document.body.style.overflow =
      'hidden'` and `:112` restores it. On desktop that removes and then
      re-adds the scrollbar, changing the viewport width by ~15px. Because
      `<body class="container">` (`src/index.html:64`) is a centred
      Bootstrap container, *every element on the page* shifts horizontally
      twice. Use `scrollbar-gutter: stable` on the root element, or lock
      scrolling with `position: fixed` on a wrapper instead of `overflow`.

- [ ] **Give the work-history images an aspect ratio.**
      `workhistory.component.html:18,30,89,101` render `<img [src]>` with
      no `width`/`height` attributes and no CSS `aspect-ratio`; the only
      sizing is `width: 100%` inside one media query
      (`workhistory.component.scss:114-116`). Until each logo decodes, its
      box is 0px tall. Add intrinsic `width`/`height` attributes (or
      `aspect-ratio` on `.img-feature-workhistory`) so the space is
      reserved. Same for the floating logos in
      `floating-logos.component.html:3-9`, which set `[style.width.px]` but
      no height.

- [ ] **Re-check CLS after the loading screen work in P1.** A large share
      of the shifts above happen *behind* the opaque overlay during its
      ~2.25s hold. The Layout Instability API has no occlusion test, so
      they are counted in full even though no user ever sees them. Removing
      or shortening the overlay does not fix the shifts, but it does stop
      the overlay from hiding them from you during manual testing.

---

## P1 — FCP 3.17 s / LCP 3.62 s

- [ ] **Prerender the home route (biggest single win).** The site has no
      SSR and no prerendering, so `dist/index.html` ships an empty
      `<app-root>` and the first pixel cannot paint until `main.js` has
      downloaded, parsed, and bootstrapped Angular. That is essentially the
      whole gap between TTFB (1.68s) and FCP (3.17s). Angular 22's
      application builder supports `"outputMode": "static"` with
      `prerender` in `angular.json`; the content is a build-time
      `config.json` import (`site-config.service.ts:2`) so there is nothing
      dynamic blocking it. This turns FCP into roughly TTFB + paint and
      makes the banner text the LCP element at first byte.

- [ ] **Cut or shorten the loading screen.** `MIN_DISPLAY_MS = 1400`
      (`loading-screen.component.ts:12`) plus the outro timeline
      (200ms scale + 150ms offset + 500ms fade, `:98-115`) holds the real
      page behind an opaque overlay for **~2.25 s after Angular boots** —
      i.e. until ~5.4s on the current numbers. As long as the overlay is
      the largest painted element, LCP is the overlay; the moment it fades,
      the banner becomes a new, later LCP candidate. Options, in order of
      impact: drop it entirely; cut `MIN_DISPLAY_MS` to ~400ms; or show it
      only on first visit (`sessionStorage` flag) so repeat navigations go
      straight to content.

- [ ] **Trim Font Awesome — 227 KB of CSS for 11 icons.**
      `angular.json:35-37` loads `fontawesome.css` (**104 KB**),
      `brands.css` (**22 KB**) and `solid.css`, all render-blocking, and
      they pull `fa-solid-900.woff2` (**119 KB**) + `fa-brands-400.woff2`
      (**115 KB**). The site uses exactly eleven glyphs:
      `circle-half-stroke, envelope, external-link-alt, facebook-f, github,
      instagram, linkedin-in, moon, sun, tiktok, up-right-from-square`.
      Replace with inline SVG icons (best — zero CSS, zero font fetch), or
      subset the two woff2 files and hand-write the ~11 `::before` rules.
      Expect to remove ~350 KB from the critical path.

- [ ] **Fix the service worker's font/image strategy.**
      `ngsw-config.json:20-34` puts `/assets/images/**` and
      `/assets/fonts/**` in a `dataGroup` with `"strategy": "freshness"`
      and a `3s` timeout. That means on every repeat visit the service
      worker goes to the **network first** for fonts and images, waiting up
      to 3 seconds before falling back to cache — the exact opposite of
      what you want for immutable assets. Move them to an `assetGroup` with
      `installMode: "lazy"` / `updateMode: "prefetch"`, or at minimum
      switch the strategy to `performance`.

- [ ] **Consider lazy-loading `animejs`.** It is imported eagerly at
      `loading-screen.component.ts:2` for an intro animation. If the
      loading screen survives P1, `await import('animejs')` inside
      `ngAfterViewInit` keeps it out of the initial bundle; if the loading
      screen goes away, the dependency goes with it.

---

## P2 — asset weight

- [ ] **`src/assets/images` is 16 MB.** The profile shots are shipped at
      full camera resolution and never resized:

      | File | Size |
      | ---- | ---- |
      | `profiles/profile1.jpg` | 3.7 MB |
      | `profiles/profile4.jpg` | 3.6 MB |
      | `profiles/profileedit.png` | 3.4 MB |
      | `profiles/profile0.jpg` | 1.8 MB |
      | `profiles/profile3.jpg` | 721 KB |
      | `profiles/profile2.jpeg` | 569 KB |

      `profile4.jpg` — **3.6 MB** — is the one actually rendered, at
      `width="300" height="400"` (`about.component.html:42-43`). That is
      roughly a 100× overdraw, and on desktop the About section is close
      enough to the fold that the fetch competes with the banner's fonts.
      Resize to 300×400 (plus a 2× variant), serve WebP/AVIF with a
      `<picture>` fallback, and delete the unreferenced `profile0/1/2/3`
      and `profileedit.png` — nothing in `src/` links to them. This alone
      should take the assets directory under 1 MB.

- [ ] **Add `loading="lazy"` and `decoding="async"` to below-the-fold
      images.** There is not a single `loading`, `decoding`, or
      `fetchpriority` attribute anywhere in `src/app` — every work-history
      logo and the About portrait is fetched eagerly during initial load.
      Conversely, add `fetchpriority="high"` to whatever ends up being the
      LCP element.

- [ ] **Compress the project images.** `projects/IMG_20160311_201710.jpg`
      (310 KB), `20181013_141834.jpg` (285 KB),
      `IMG_20150314_120402.jpg` (226 KB), `20191020_053757.jpg` (181 KB),
      `DBTBT.png` (127 KB). These are on the lazy `/projects` route so they
      do not hit the home page's metrics, but they are still oversized.

- [ ] **Defer or drop one of the three analytics scripts.** The page loads
      gtag.js (`index.html:15`), `@vercel/analytics` and
      `@vercel/speed-insights` (`app.component.ts:41-42`). Speed Insights
      is what is producing these measurements so it stays; gtag.js and
      Vercel Web Analytics overlap heavily. Dropping one removes a
      third-party connection from the critical path.

---

## P3 — TTFB 1.68 s

1.68s to first byte for a fully static build is high and is pure overhead
on top of every other metric. Nothing in the app code causes it; it is
delivery configuration. In likely order of payoff:

- [ ] **Check the Cloudflare → Vercel hop.** Per `CLAUDE.md`, Cloudflare
      proxies (orange-cloud) `yannislam.org` to Vercel. That is two CDNs in
      series: a Cloudflare edge miss becomes a full round trip to Vercel's
      edge, which is where a ~1.7s P75 comes from. Either set the DNS
      records to DNS-only so Vercel's edge serves directly, or add a
      Cloudflare Cache Rule that actually caches the HTML at Cloudflare's
      edge. Email routing (MX/SPF/DKIM) is unaffected by the proxy setting.

- [ ] **Add explicit cache headers in `vercel.json`.** It currently only
      sets `buildCommand` and `outputDirectory` — no `headers` block. Add
      `Cache-Control: public, max-age=31536000, immutable` for
      `/assets/**` and the hashed build output, and a short
      `s-maxage` + `stale-while-revalidate` for `/index.html` so the
      document is served from edge cache rather than revalidated.

- [ ] **Re-measure with Speed Insights split by region.** The Countries
      panel shows US (6 samples, score 37) and UK (3 samples, score 3).
      Three UK samples scoring 3 is consistent with a trans-Atlantic
      origin fetch on every request — which is exactly what the proxy-hop
      theory predicts, and it is worth confirming before changing DNS.

---

## Suggested order

1. **P0 CLS fixes** — a few hours, no architectural risk, moves the worst
   metric. Do the typewriter `min-height` and the `overflow` toggle first;
   they are two small diffs.
2. **P1 loading screen + prerender** — the structural fix for FCP/LCP.
   Prerendering is the larger change; shortening `MIN_DISPLAY_MS` is a
   one-line change worth landing immediately regardless.
3. **P1 Font Awesome + P2 image resizing** — mechanical, high byte savings.
4. **P3 TTFB** — infrastructure, no code change, but it is a flat ~1s off
   every single metric so do not leave it last indefinitely.

Re-check Speed Insights ~7 days after each batch so the P75 has enough
fresh samples to have actually moved.
