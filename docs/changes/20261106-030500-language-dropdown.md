Date: 2026-11-06 03:05:00

# The Language Button Opens A Dropdown Of Flags

The header's flag button opens a dropdown listing every language (flag plus its own name) instead of cycling to the next
flag on each click. It restores the menu that `7a2c6a35` had replaced, so a visitor can pick a language directly. The
menu closes on Escape, on a click outside it, and after a choice; the current language is marked `aria-current`.

The header component's style budget warning is raised from 7 kB to 7.5 kB (the dropdown styles put it 6 bytes over).
