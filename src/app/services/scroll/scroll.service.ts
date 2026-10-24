import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Shared vertical-scroll state for anything that used to add its own
// `window:scroll` listener (header logo rotation + nav shadow, footer
// bottom-bar collapse). Consolidating to one passive listener, throttled to
// once per animation frame, means a page with N scroll-driven components
// no longer does N synchronous `document.documentElement.scrollHeight`
// reads (a forced layout) on every single scroll event.
@Injectable({
  providedIn: 'root'
})
export class ScrollService {

  // Domino (Angular's server-side DOM emulation) provides a `window`
  // stand-in during prerendering, but scroll APIs aren't meaningfully
  // implemented there, so this whole service is a no-op on the server —
  // `y`/`maxScroll` just stay at their initial 0.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Current vertical scroll position, written at most once per animation
  // frame from a single passive listener.
  readonly y = signal(0);

  // document.documentElement.scrollHeight - window.innerHeight, i.e. how
  // far the page can actually scroll. This only changes on resize or when
  // content height changes (fonts loading, images decoding, sections
  // expanding) -- not on every scroll tick -- so it's tracked separately
  // via a ResizeObserver on <body> instead of being recomputed inline in
  // the scroll handler.
  readonly maxScroll = signal(0);

  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;

  constructor() {
    if (!this.isBrowser) return;

    this.recomputeMaxScroll();
    this.y.set(window.scrollY);

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.recomputeMaxScroll);

    this.resizeObserver = new ResizeObserver(this.recomputeMaxScroll);
    this.resizeObserver.observe(document.body);

    // This service is provided in root and lives for the lifetime of the
    // app (there's no meaningful "destroy" for a singleton the whole page
    // depends on), so the listeners above are intentionally never removed
    // -- same lifetime assumption ThemeService's storage/media-query
    // listeners already make.
  }

  private readonly onScroll = () => {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.y.set(window.scrollY);
    });
  };

  private readonly recomputeMaxScroll = () => {
    this.maxScroll.set(Math.max(document.documentElement.scrollHeight - window.innerHeight, 0));
  };
}
