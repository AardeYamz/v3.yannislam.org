# Link preview: one iframe load per hover

Date: 2026-11-21 12:10:00

`mouseover` bubbles from every child of a link, so `LinkPreviewService.show()`
ran several times per hover and each call scheduled its own iframe attempt
(audit finding M-4, #200). `show()` now clears the pending hover-intent and
iframe-timeout timers before scheduling, so one hover starts one load. A spec
calls `show()` three times inside the hover-intent delay and expects a single
attempt.
