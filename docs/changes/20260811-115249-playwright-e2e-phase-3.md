Date: 2026-08-11 11:52:49

# Playwright E2E: Phase 3 breadth coverage

## Context

`docs/todo/playwright-e2e-testing-plan.md` sequenced the E2E rollout in four
phases. Phases 1–2 (foundation, CI wiring, and the P0 specs `smoke`,
`home-sections`, `navigation`, `theme`) shipped in
`20260811-030901-playwright-e2e-testing.md`, which explicitly left Phase 3–4
as "future work, not started here". This picks up Phase 3: the plan's
§4.5–4.9 breadth specs.

Phase 4 (`accessibility.spec.ts` with axe, and the deliberately-deferred
visual regression) is still outstanding.

## What was added

Five new spec files, all reusing the existing `e2e/fixtures.ts` helpers
(`gotoAndSettle`, `headerNav`, the analytics/service-worker blocking):

- **`projects.spec.ts`** (§4.5) — subsection headings and numbers, all 6
  college and 4 high-school entries rendering by title, each entry showing a
  timeframe and at least one description paragraph, and every entry with a
  `link` rendering an anchor with that `href`, `target="_blank"` and a
  `rel` containing `noopener`. Deliberately does *not* re-cover the
  `/projects` ↔ `/projects/highschool` routing or the "`/projects` doesn't
  render the high-school list" rule — `navigation.spec.ts` already owns
  those.
- **`resume.spec.ts`** (§4.6) — clicking the banner's resume button opens a
  popup at `/assets/resume/<name>.pdf`, that URL returns 200 with
  `content-type: application/pdf`, and the resolved filename still matches
  the `"<name> YYYYMMDD.pdf"` pattern `generate-resume-manifest.js` sorts
  on. The unit spec only asserts the URL string `ResumeService` builds; the
  failure this guards is a manifest pointing at a file that isn't in the
  build.
- **`footer-and-links.spec.ts`** (§4.7) — one side-bar link per
  `about.contact` entry, socials opening in a new tab, the `mailto:` email
  link, the repo/built-with/design-credit links carrying
  `rel="nofollow noopener noreferrer"`, and the credits line showing the
  repo text plus the current year. Plus an `@external`-tagged block that
  actually requests each outbound URL (see "External link checks" below).
- **`responsive.spec.ts`** (§4.8) — mobile-project only: the hamburger
  replacing the desktop nav below 1050px, the drawer's open/close state
  tracking `aria-expanded` and `.aside-show`, every `siteMenu` entry
  appearing in the drawer, section-scroll and route entries both closing the
  drawer on tap, the mobile contact block replacing the desktop side bars,
  and no horizontal overflow. The `aria-controls`/`aria-label` assertions are
  regression cover for
  `20260810-211125-fix-hamburger-menu-accessibility.md`.
- **`assets.spec.ts`** (§4.9) — request-level only, no page and no boot
  sequence, so it is by far the cheapest file in the suite. Checks every
  locally-referenced `config.json` image resolves, the three theme logo
  variants exist, `robots.txt`/`sitemap.xml`/`manifest.webmanifest`/
  `favicon.ico` are served, every `<loc>` in the sitemap is reachable, and
  the sitemap still lists every route the router defines.

That last sitemap assertion is deliberate follow-through on
`20260731-184800-seo-fixes-4.md`, which noted that nothing generates
`sitemap.xml` and it needs a manual update whenever
`app-routing.module.ts` gains a route. This is the check that notices when
that didn't happen.

## App change: `rel` on outbound project links

`workhistory.component.html` rendered both the `link` and `demoLink`
anchors with `target="_blank"` and no `rel`, while every external link in
`footer.component.html` already used
`rel="nofollow noopener noreferrer"`. The plan's §4.5 specified asserting
`rel` contains `noopener` on project links, so rather than weaken the
assertion to match the markup, the markup was brought in line:

```html
<a class="mx-3" style='color: inherit' [href]="exp['link']"
  target="_blank" rel="noopener noreferrer">
```

`nofollow` was intentionally *not* added — the footer uses it when crediting
other people's work, whereas these are the site owner's own project sources.
Modern browsers imply `noopener` for `target="_blank"` anyway, so this is
belt-and-braces rather than a live vulnerability.

The footer's *social* links (`.footer-left-bar`, `.footer-mobile-socials`)
also carry `target="_blank"` with no `rel`. Left alone here: adding
`nofollow` to the owner's own profiles is an SEO judgment call, not a test
concern, and `footer-and-links.spec.ts` asserts only `target` on them.

## External link checks

`footer-and-links.spec.ts` ends with an `@external`-tagged describe block
that requests each outbound URL (socials, repo, Angular, the three design
credits) and fails only on a hard 404/410 — several of those hosts reject
HEAD or bot-ish clients outright, so a non-404 is the strongest signal
available without false positives.

The workflow already carried a Monday 07:00 UTC schedule whose comment
referenced "the external-link checks in footer-and-links.spec.ts that are
excluded from PR runs" — a file that didn't exist yet. The run step now
actually implements that exclusion:

```yaml
run: npx playwright test --shard=${{ matrix.shard }}/2 ${{ github.event_name == 'schedule' && ' ' || '--grep-invert @external' }}
```

A third-party site being down or rate-limiting a CI egress IP is not a
regression in this repo, so those tests can never redden a pull request.

## Verification

Everything below was run locally against the real production build
(`npm run build`, then `http-server dist/v3.yannislam.org/browser` the way
CI does it), not `ng serve`:

- **Chromium project**: 60 passed, 10 skipped (the mobile-only file).
- **Mobile (Pixel 7) project**: 50 passed, 20 skipped (the desktop-only
  navigation and footer files).
- **`@external` block**: 10 passed.
- **Unit suite**: 143/143 passing — the `rel` template change breaks nothing.
- **`npx tsc -p e2e/tsconfig.json --noEmit`**: clean.

Suite total is now 70 tests per project (up from 30), and the two-project PR
run finishes in roughly 2 minutes of wall clock per project before sharding.

Two type errors surfaced only under `tsc` (Playwright transpiles specs
without typechecking, so both suites were green while the types were wrong)
and are worth knowing about for future specs:

- Work and volunteering entries carry a `logoKey` instead of their own
  `imgs`, so the property is genuinely absent from those object shapes and a
  `{ imgs?: string[] }[]` annotation doesn't fit them. `assets.spec.ts` uses
  an `imagesIn()` helper with an `'imgs' in entry` narrow instead.
- `handle` is optional across `about.contact` (Github has none), so
  `footer-and-links.spec.ts` asserts it exists for the Email entry before
  asserting the rendered link text.

## Local runs

Unchanged from Phase 1–2:

```bash
npm run test:e2e            # headless, against dist/ if CI=1 else ng serve
npm run test:e2e:ui         # Playwright's interactive UI mode
npm run test:e2e:report     # open the last HTML report
npx playwright test --grep @external   # the outbound link checks on demand
```
