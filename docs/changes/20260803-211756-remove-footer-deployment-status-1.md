Date: 2026-08-03 21:17:56

# Remove hard-coded deployment status from the public footer

## Context

The Karma/Jasmine test-suite work (PR #37) added a `deploymentStatus` object
directly to `FooterComponent`:

```ts
deploymentStatus = {
    lastUpdate: '2026-08-01',
    testsPassing: '80/96 (83.3%)',
    buildStatus: '✅ Success'
};
```

and rendered it in the footer template on every single page:

```html
<div class="mt-2 deployment-status" style="font-size: 0.85rem; color: #999;">
    {{deploymentStatus.buildStatus}} | Tests: {{deploymentStatus.testsPassing}} | Last Updated: {{deploymentStatus.lastUpdate}}
</div>
```

Two problems, independent of each other:

1. **It was already stale and could only drift further.** Nothing updates
   the literal — `DEPLOYMENT_STATUS.md` (added in the same PR, and kept
   current by hand) already said 118/118 tests passing (100%), while the
   footer still read 80/96 (83.3%). Every future test-count change would
   need a second, easy-to-forget edit in a component file to stay in sync.
2. **CI/test metadata does not belong on a public-facing page regardless of
   accuracy.** This is a portfolio site; footer visitors are recruiters and
   other site visitors, not repo maintainers. Build status and pass rates
   are internal engineering signal, not content for the live UI.

`DEPLOYMENT_STATUS.md` already covers this appropriately as a repo-internal
doc. The footer copy was pure duplication that should not have shipped to
the UI.

## Change

- Removed the `deploymentStatus` field (and its constructor-adjacent
  declaration) from `footer.component.ts`.
- Removed the `<div class="mt-2 deployment-status" ...>` block from
  `footer.component.html`.
- Removed the spec assertion that checked for `deploymentStatus`.
- `footer.component.scss` never had a `.deployment-status` rule (the block
  was styled entirely with an inline `style` attribute), so there was
  nothing to clean up there.

`DEPLOYMENT_STATUS.md` is untouched — it remains the correct, repo-internal
place for build/test status.

## Files touched

- `src/app/components/general/footer/footer.component.ts`
- `src/app/components/general/footer/footer.component.html`
- `src/app/components/general/footer/footer.component.spec.ts`

## Verification

- `ng build` — succeeds, no errors (only pre-existing Sass `@import`
  deprecation warnings, unrelated to this change).
- `ng test --watch=false` (Chrome Headless via
  `/opt/pw-browsers/chromium-1194`) — full suite passes (117/117).
- `ng serve` + a Playwright script driving headless Chromium: loaded the
  homepage, scrolled to `<footer>`, and read its rendered `innerText` —
  confirmed no deployment-status line and that the rest of the footer
  (email link, repo/build-with credits, copyright year, design credits)
  still renders correctly. No console errors attributable to this change
  (only pre-existing `net::ERR_TUNNEL_CONNECTION_FAILED` messages from
  external resources blocked by this sandbox's network proxy).
