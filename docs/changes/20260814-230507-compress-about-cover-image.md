Date: 2026-08-14 23:05:07

# Compress the about-section cover image

## Context

`claude/scroll-arrow-about-bg-qxq749` added `src/assets/images/covers/indexcover.jpg` as a full-bleed CSS `background-image` on the about section. The source file was a camera-original, 7952×5304px, 6.86MB JPEG — never resized or recompressed before being committed.

That branch predates this repo's Lighthouse CI budget check (`lighthouserc.js`, added on `main` after this branch diverged). Once merged with `main`, the check ran for the first time against this file and failed hard: `resource-summary.total.size` requires the page to stay under 7.5MB total, and this one image alone pushed `/` to 13.7MB — nearly double the budget. (Several accessibility assertions also showed `found: 0` in the same CI run, but those are pre-existing warning-level assertions in this project's Lighthouse config, unrelated to this change.)

## Fix

Resized to 1920px wide (from 7952px) and re-encoded as JPEG quality 70 (mozjpeg), via `sharp`. The image is displayed via `background-size: cover` behind a gradient overlay at `opacity: var(--bg-opacity, 0.3)` by default, so the extra resolution and higher quality were pure waste — nothing at that low an opacity needs camera-original detail.

- `src/assets/images/covers/indexcover.jpg`: 6.86MB → 183KB (7952×5304 → 1920×1281). Visually spot-checked (via the Read tool) — no visible artifacting.

This brings `/` back under the 7.5MB Lighthouse budget with room to spare.
