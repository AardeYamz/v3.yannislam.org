# Remove leftover `debug()` click handler in work history

## Context

`WorkHistoryComponent`'s `.workhistory-description-box` div (the job/project
text block next to each entry's image carousel) had `(click)='debug()'`
wired up. `debug()` scrolled `@ViewChild('imgContainer')` — the carousel's
`.img-container` div — to its `scrollHeight`:

```ts
debug() {
    this.imgContainer?.nativeElement.scroll({
      top: this.imgContainer?.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
}
```

The method's own name gives it away as a leftover dev-time probe, not an
intentional feature: clicking anywhere in a job/project description's text
(a `<p>`, the timeframe, the skill tags — anywhere inside the box) silently
smooth-scrolled an unrelated element next to it, with no visual affordance
suggesting the click did anything, and no relation between "read the
description" and "scroll the image carousel."

## Fix

- `workhistory.component.html`: removed `(click)='debug()'` from
  `.workhistory-description-box`.
- `workhistory.component.ts`: removed `debug()`.
- Searched the rest of the component for other consumers of
  `@ViewChild('imgContainer') imgContainer: ElementRef | undefined;` and the
  `#imgContainer` template reference variable (on the carousel's
  `.img-container` div, only present in the `i % 2 == 0` layout branch) —
  `debug()` was the only reader of `imgContainer`, so both the `@ViewChild`
  field and the `#imgContainer` template ref were removed too, rather than
  left as dead code. The carousel's own navigation (owl-carousel-o's
  `customOptions` — loop, drag, autoplay) is untouched; it doesn't use
  `imgContainer` at all.
- `workhistory.component.spec.ts` had no reference to `debug()` or
  `imgContainer`, so no test changes were needed.

## Files touched

- `src/app/components/home/workhistory/workhistory.component.html` —
  removed the `(click)='debug()'` binding and the `#imgContainer` template
  ref.
- `src/app/components/home/workhistory/workhistory.component.ts` — removed
  `debug()`, the `@ViewChild('imgContainer')` field, and the now-unused
  `ElementRef`/`ViewChild` imports.

## Verification

- `npx ng build` — no errors.
- `npx ng test --watch=false` — all 117 existing specs pass.
- `npx ng serve` + headless Chromium: loaded the homepage, clicked inside a
  work-history description box's text (`<p>`), and confirmed no scroll
  happened on any `.img-container` (compared `scrollTop` before/after
  click) and no console errors were introduced. Confirmed
  `customOptions`/the `owl-carousel-o` component declaration are untouched
  by this change — the carousel's own drag/autoplay behavior never
  depended on `imgContainer`.
