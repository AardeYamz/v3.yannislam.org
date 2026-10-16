Date: 2026-09-22 15:09:54

# Design System Extraction

The site's visual language has lived entirely in `src/theme.scss`,
`src/variables.scss`, `src/styles.scss` and the per-component stylesheets since the
Material Design 3 token work (see `20260811-225106-material-design-3-tokens.md`).
That is fine for building the site, but it means the system is only legible by
reading SCSS — there is no browsable reference, and nothing states which of the
values are load-bearing.

This extracts that system, unchanged, into a standalone Design System artifact:

https://claude.ai/artifact/Vpkz5aD3QRDhw12ChdaRpw

No source files changed. Nothing was re-tinted, renamed or "cleaned up" on the
way out — the artifact carries the values exactly as the stylesheets define them.

## What was extracted

- **33 color tokens across all three modes** (`default`, `light`, `dark`): the
  nine-hue palette plus the two washes, and the full `--md-sys-color-*` role set
  layered over it. Roles that alias a palette entry are carried as aliases, so
  they keep resolving per mode the way the custom properties do.
- **19 type styles** in four groups over the two families, including the
  responsive steps each one takes at 376/480/768/1000/1600/2200px.
- **The M3 shape, elevation and state-layer scales**, plus the three easing
  curves — including `cubic-bezier(0.645, 0.045, 0.355, 1)`, which is used
  throughout but is written out at each use rather than declared as a property.
- **Spacing and sizing**: the source has no spacing token scale, so these are
  the recurring literals lifted at their exact values and labelled by role.
- **All 14 Calibre and SF Mono woff2 files**, and all 11 logo variants.
- **Eight components** with live previews and guidelines: Button, IconButton,
  NavLink, SectionTitle, ExperienceCard, VerticalTabs, BulletList,
  UnderlineLink. The previews are hand-written HTML/CSS renditions of each
  component's real rules, not the Angular components themselves — there is no
  exported component bundle to build from.

## The four `color-mix()` roles

`--md-sys-color-primary-container`, `--surface-container-low`,
`--surface-container-highest` and `--outline-variant` are computed with
`color-mix()`. No token format holds a `color-mix()` expression, so the artifact
carries each one's resolved sRGB value per mode instead, with the source
expression recorded in its usage note:

| Role | default | light | dark |
| --- | --- | --- | --- |
| `primary-container` | `#5a4722` | `#eccba7` | `#503a12` |
| `surface-container-low` | `#12213a` | `#fbf9f7` | `#080b13` |
| `surface-container-highest` | `#434e68` | `#ccc6bb` | `#323d56` |
| `outline-variant` | `rgba(48, 60, 85, 0.55)` | `rgba(228, 222, 210, 0.55)` | `rgba(28, 39, 64, 0.55)` |

These match what the browser computes today. They are a snapshot, not a
replacement — if a `--color-*` value changes, they need recomputing.

## Two contrast failures found on the way

Both are real, both are in the shipped site, and both were left exactly as-is in
the artifact (with the failure flagged) rather than quietly corrected. Neither is
fixed here — this change touches no source files.

1. **`--md-sys-color-primary` on the page ground in `light` mode is 2.94:1.**
   The accent carries 13px nav labels, 13px button text and 16px eyebrows, all of
   which need 4.5:1 under WCAG AA. It passes comfortably in `default` (8.2:1) and
   `dark` (11:1) — light mode is the only one affected. Darkening
   `--color-orange` in the light block from `#d9720c` toward roughly `#9a4f06`
   would clear it; that trades some of the accent's brightness against the cream
   ground, so it is a design call, not a mechanical fix.

2. **`--md-sys-color-on-surface-variant` on the page ground in `dark` mode is
   4.39:1.** This aliases `--color-slate`, which `body` sets as its own color, so
   it is the global body ink — the miss applies to ordinary paragraph copy across
   the whole page in that one mode. It clears in `default` (5.2:1) and `light`
   (5.3:1). Lightening `--color-slate` in the dark block from `#6b7590` by
   roughly one step would clear it.

Everything else holds: `--md-sys-color-on-surface` reads 11:1 or better on its
ground in every mode, and `--color-light-slate` reads 8.8:1 in light mode.

Worth noting alongside these: `--md-sys-color-outline` is already documented in
`styles.scss` as unusable for control borders (about 1.2:1 against the ground in
light mode), which is why `.main-btn` outlines itself in `$Primary`. The two
findings above are the same class of problem in places that have not been caught
yet.
