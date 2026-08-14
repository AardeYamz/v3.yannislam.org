Date: 2026-08-11 22:52:21

# Fixing The Mobile Drawer Specs Against The Hidden AardeYamz Entry

`main` was red for roughly ten hours on 2026-08-11, from 12:39 UTC. Every open
PR's `e2e` job failed, which made unrelated PRs look broken and cost time in
diagnosing each one separately. The cause is worth writing down, because
nothing in the process that produced it was wrong — two correct changes
combined into a broken result.

## The two changes

Both merged within six minutes of each other, and each was green on its own
branch:

- **#56** (`8156b5f`, 12:33) marked the AardeYamz entry `hidden` in
  `config.json` and filtered hidden entries out of `SiteConfigService.menu`, so
  `/aardeyamz` stays reachable directly but stops appearing in the nav. It
  updated `e2e/navigation.spec.ts` and the service's unit spec to match.
- **#55** (`0e84c1b`, 12:39) added `e2e/responsive.spec.ts` as part of the
  Phase 3 e2e breadth work. It was written before #56 landed, and asserted
  that the mobile drawer lists **every** `config.siteMenu` entry, and that
  tapping the AardeYamz entry routes to `/aardeyamz`.

## Why git merged it cleanly anyway

They touch disjoint files. #56 never edited `responsive.spec.ts` because it
did not exist on that branch; #55 never edited `site-config.service.ts`. There
is no textual overlap for git to flag, and neither branch's CI could see the
other's change. The conflict is semantic — a shared assumption ("the drawer
shows every entry in `siteMenu`") that one side quietly invalidated.

Post-merge the drawer renders 5 links against a 6-entry `siteMenu`, so:

- `the drawer lists every nav entry from config` fails on a count mismatch.
- `choosing a routed entry navigates and closes the drawer` waits 30 seconds
  for a link that no longer renders, then times out.

## The fix

Apply the same filter #56 already applied to `navigation.spec.ts`, so the two
specs agree on what "the nav" means:

```ts
const visibleMenuItems = config.siteMenu.filter((item) => !item.hidden);
const firstScrollItem = visibleMenuItems.find((item) => item.scrollSection)!;
const firstRouteItem = visibleMenuItems.find(
  (item) => !item.scrollSection && item.siteLocation.startsWith('/') && !item.siteLocation.startsWith('/#'),
)!;
```

Two details in how the specs were rewritten:

**The routed-entry test keeps its point.** It exists to prove a *routed* entry
behaves differently from a *scroll* entry — navigating away and closing the
drawer, rather than scrolling within the page. Deleting it because AardeYamz
went hidden would have dropped that coverage. Instead it now drives
`firstRouteItem`, which resolves to Projects → `/projects`, and asserts against
`firstRouteItem.siteLocation` rather than a hardcoded `/aardeyamz`. It stays
correct if the menu changes again.

**A regression test was added for the thing that broke.** #56 asserted the
easter egg is absent from the *desktop* nav; there was no mobile counterpart,
which is exactly the hole this fell through:

```ts
test('the drawer hides the AardeYamz easter egg, like the desktop nav', async ({ page }) => {
  await page.locator('.hamburger-menu').click();
  await expect(page.locator('#mobile-menu a').filter({ hasText: 'AardeYamz' })).toHaveCount(0);
});
```

## Verifying it was the base branch, not the PR

The failure first surfaced on a Dependabot PR (#54), where the obvious reading
was that the dependency bump broke something. It was worth ruling that out
properly rather than by argument: check out clean `main`, install from `main`'s
**own** lockfile, rebuild, and run the specs. The identical two failures
appeared with none of the PR's changes present, which located the bug on the
base branch in one step.

That is the cheap move whenever a PR fails in an area it does not touch, and it
is worth doing before reading a single line of the PR's diff.

## What would have caught this earlier

Nothing in the merge process, which is the uncomfortable part — both PRs were
correct and green. Two things would have surfaced it sooner:

- Re-running CI on the second PR after the first merged, rather than merging on
  a green run against a stale base. GitHub's "require branches to be up to date
  before merging" branch-protection setting does exactly this, at the cost of a
  re-run per merge.
- A convention that config-shape changes (like adding `hidden`) are asserted in
  one place both the desktop and mobile specs read from, rather than each spec
  filtering `config.siteMenu` for itself.

Neither is adopted here yet; they are recorded as the options, since a repo
with two concurrent e2e-touching PRs in flight will hit this again.
