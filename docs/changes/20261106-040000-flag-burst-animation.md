Date: 2026-11-06 04:00:00

# Flag Burst Animation (preview)

When the language changes, the header's flag button replays a short burst: the new flag pops in with an overshoot, a ring
expands from it and eight sparks in the flag's accent colour fly outward and fade (about 0.6 s). The new `FlagBurstComponent` (own styles, so the header stylesheet stays within its budget) is keyed on a counter
that `HeaderComponent.selectLanguage()` bumps after the language has loaded, so it does not play on first load, and it is
switched off under `prefers-reduced-motion`.

A one-off for previewing, stacked on the Dutch edition.
