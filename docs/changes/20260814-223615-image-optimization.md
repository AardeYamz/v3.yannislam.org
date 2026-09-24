Date: 2026-08-14 22:36:15

# Image optimization (`src/assets/images`)

## Context

`src/assets/images/profiles/` and `src/assets/images/projects/` held
unprocessed camera-original and phone-screenshot files — several multi-MB
JPEGs/PNGs displayed at a few hundred CSS pixels. Total folder size was
16MB, all shipped to every visitor regardless of viewport.

## Approach

**Dead weight removal.** Grepped `src/app` and `src/assets/config.json` for
every filename in `src/assets/images/profiles/`. Only `profile4.jpg` is
referenced (about-section photo + `index.html`'s `og:image`/`twitter:image`,
left untouched per scope — a separate PR owns the social-card asset).
`profile0.jpg`, `profile1.jpg`, `profile2.jpeg`, `profile3.jpg`, and
`profileedit.png` (10.4MB combined) had zero references anywhere in the repo
and were deleted outright rather than optimized.

**Resize + recompress in place.** Used `npm install --no-save sharp` and a
throwaway script (not committed) to batch-process the remaining offenders,
keeping original filenames/extensions to avoid touching every reference in
`config.json`/templates:
- `profile4.jpg` — displayed at a fixed `300×400` CSS box
  (`about.component.html`). Source was `2671×3562` (same 3:4 aspect ratio);
  resized to `600×800` (2x for retina) and re-encoded at JPEG quality 80
  (mozjpeg). 3.67MB → 64KB.
- Project/work-history photos (`IMG_*.JPG`, `*.jpg` under
  `src/assets/images/projects/`) render inside a 600px-wide carousel or a
  same-width thumbnail (`workhistory.component.html`, reused for both the
  Projects and College/High-School Projects sections). These were already
  downsampled to ~1600px on the long edge by a prior process but still
  encoded at high quality; capped to 1200px max dimension (2x of the 600px
  display width) and re-encoded at JPEG quality 78 (mozjpeg).
- `DBTBT.png` (a website screenshot) — resized from `1600×900` to
  `1200×675` and re-encoded with palette-based PNG compression
  (`sharp .png({ palette: true, compressionLevel: 9 })`). 126KB → 19KB, text
  still crisp.
- `OLS Regression Plot.png` was already small (`384×263`, 51KB); left at its
  native size and just re-compressed with the same PNG settings. 51KB →
  16KB.

All JPEGs were re-encoded via `.rotate()` first (bakes in EXIF orientation,
then strips the EXIF block) so orientation is preserved without carrying the
metadata.

**Template changes.**
- `about.component.html`: the profile `<img>` already had `width`/`height`
  attributes; added `loading="lazy"` and switched to Angular's
  `NgOptimizedImage` (`ngSrc` instead of `src`). `NgOptimizedImage` is
  registered in `home.module.ts`'s `imports` (the component is
  `standalone: false`, declared in `HomeModule`, so the directive is
  imported at the module level rather than on the component itself).
- `workhistory.component.html`: added `loading="lazy"` plus `width="600"
  height="400"` to all 4 `<img>` tags (carousel + thumbnail, both
  even/odd-index branches). These images are dynamically bound
  (`[src]="img"`) to a mix of organization logos and project photos with
  varying native aspect ratios, so a fixed `width`/`height` pair is only a
  layout-space/CLS hint, not a guarantee of the real ratio — `object-fit:
  cover` was added to `.img-feature-workhistory` in the component's `.scss`
  so mismatched images crop instead of stretching/distorting.
  `NgOptimizedImage` was **not** adopted here: it requires a static `ngSrc`
  (or a src that matches its aspect-ratio validation) and doesn't fit the
  carousel's per-item dynamic binding without a larger refactor, per the
  task's own carve-out for that case.

## Files touched

- `src/assets/images/profiles/profile4.jpg` — resized/recompressed.
- `src/assets/images/profiles/{profile0.jpg,profile1.jpg,profile2.jpeg,profile3.jpg,profileedit.png}` — deleted (unreferenced).
- `src/assets/images/projects/*.{jpg,JPG,png}` (10 files) — resized/recompressed.
- `src/app/components/home/about/about.component.html` — `NgOptimizedImage` + `loading="lazy"`.
- `src/app/components/home/home.module.ts` — import `NgOptimizedImage`.
- `src/app/components/home/workhistory/workhistory.component.html` — `loading="lazy"` + `width`/`height` on all 4 image tags.
- `src/app/components/home/workhistory/workhistory.component.scss` — `object-fit: cover` on `.img-feature-workhistory`.

## Verification

- `npx ng build` — succeeds, no new errors or warnings (pre-existing
  `header.component.scss` budget warning is unrelated to this change).
- `du -sh src/assets/images`: **16MB → 980KB** before/after.
- Visually spot-checked resized `profile4.jpg` and `DBTBT.png` (rendered via
  the Read tool) — correct orientation, no visible artifacting, screenshot
  text still legible after PNG palette compression.
