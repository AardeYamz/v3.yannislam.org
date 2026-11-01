Date: 2026-11-01 20:01:53

# Compress The Project Images

Ten images in `src/assets/images/projects/` were stored at 1600 px wide and are shown at
about 600 px. They are now 1200 px wide (still 2x for high-density screens) and
recompressed; the file names are unchanged, so no markup or config changed.

- Total size of the ten files: about 1.9 MB down to about 0.84 MB.
- `OLS Regression Plot.png` keeps its 384x263 size and is only recompressed.

Split out of the old image-optimization PR (#70), which was closed because the
WebP profile photos, lazy loading and the work-history rewrite had landed on
`main` in the meantime.
