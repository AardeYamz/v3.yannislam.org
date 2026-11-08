Date: 2026-11-04 05:15:00

# Fix The Desktop Footer Transition At The Bottom Of The Page

On desktop, scrolling to the bottom faded the fixed side bars out, but the
collapsed contact row that replaces them did not appear on screen.

## Cause

`.footer-bottom-contact` grew from `max-height: 0` to `80px` when
`FooterComponent.atBottom` turned true. That made the page about 100px taller
while the visitor was already at the bottom, so the row landed below the fold
(and the taller page could also flip `atBottom` back).

## What changed

- `footer.component.scss`: the row now always takes its space (`margin-top:
  24px`, natural height) and only fades and slides (`opacity`, `transform`).
  The page height no longer changes when the side bars collapse, so the row
  fades in where the visitor is looking. Desktop pages are now about 55px
  taller at the bottom than before.
