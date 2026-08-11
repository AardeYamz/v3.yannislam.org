import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { domainFromUrl, isPreviewableUrl, LinkPreviewData } from './link-preview-card';

const VISIBLE_CLASS = 'link-preview-card--visible';
const IFRAME_CLASS = 'link-preview-card--iframe';
const VIEWPORT_MARGIN = 8;
const HOST_GAP = 10;

// The live iframe is rendered at a real desktop size and scaled down, so
// the target page lays out the way it actually does full-size instead of
// squashing into a tiny mobile-width preview. The resulting visible size
// (1120 * 0.25 = 280, 700 * 0.25 = 175) must match $frame-width/$frame-height
// in link-preview.scss, which sizes the overflow: hidden wrapper it's clipped to.
const IFRAME_WIDTH = 1120;
const IFRAME_HEIGHT = 700;
const IFRAME_SCALE = 0.25;

// X-Frame-Options/CSP-blocked navigations still fire `load` (the browser
// just refuses to paint the response) - the idea is that a blocked load
// resolves faster than a real one, since nothing was actually rendered.
// That held up against a local, zero-latency test server (a blocked 'load'
// fired at ~50ms vs. ~145ms for an intentionally-delayed real one) but
// doesn't hold up over the real internet: a blocked response still needs
// the full DNS+TLS+request/response round trip before the browser can even
// see the header that blocks it, so "blocked" and "real-but-quick" become
// hard to tell apart once real latency (not localhost's ~0ms) is added to
// both. There is no other signal available either - contentDocument on a
// cross-origin frame is null regardless of whether it's blocked or genuinely
// loaded, that's the browser's cross-origin isolation, not something this
// can read. Given that, and that several of this app's actual targets
// (LinkedIn, GitHub, Facebook, Instagram, TikTok) are all but certain to
// block framing, this threshold is set well above realistic real-world
// round-trip time - biased toward the safe fallback card (a false "blocked"
// costs a live preview that would have worked; a false "real" costs a
// visibly blank box before the browser's own real content, if any, ever
// paints in it) rather than toward showing the live preview quickly.
const MIN_REAL_LOAD_MS = 800;
// Upper bound in case a blocked frame's `load` never fires at all (seen in
// some CSP frame-ancestors cases, which cancel navigation pre-commit) - kept
// comfortably above MIN_REAL_LOAD_MS so a genuinely slow-but-real load still
// gets a fair chance to clear that bar before this cuts it off.
const IFRAME_TIMEOUT_MS = 2600;

// Single shared floating card, reused across every hoverable element on the
// page (social icons, banner blurb links) rather than one DOM node per
// trigger - there's only ever one preview visible at a time anyway.
@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  private readonly isBrowser: boolean;
  private card: HTMLElement | null = null;
  private iconEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private domainEl!: HTMLElement;
  private frameEl!: HTMLIFrameElement;
  private lastHost: HTMLElement | null = null;
  private attemptToken = 0;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  show(host: HTMLElement, data: LinkPreviewData | null | undefined): void {
    if (!this.isBrowser || !data || !isPreviewableUrl(data.url)) {
      return;
    }

    const card = this.ensureCard();
    this.lastHost = host;
    this.iconEl.className = data.icon;
    this.titleEl.textContent = data.title;
    this.domainEl.textContent = domainFromUrl(data.url);

    // Always show the icon/title/domain card immediately - it's the known-
    // good fallback - then try to upgrade to a live preview once (if) the
    // iframe proves it actually rendered something.
    card.classList.remove(IFRAME_CLASS);
    this.position(card, host);
    card.classList.add(VISIBLE_CLASS);

    this.attemptIframe(data.url);
  }

  hide(): void {
    this.attemptToken++; // invalidate any in-flight iframe attempt
    this.card?.classList.remove(VISIBLE_CLASS);
    if (this.frameEl) {
      this.frameEl.src = 'about:blank';
    }
  }

  private attemptIframe(url: string): void {
    const token = ++this.attemptToken;
    const frame = this.frameEl;
    const startedAt = performance.now();
    let settled = false;

    const succeed = () => {
      if (settled || token !== this.attemptToken || !this.card) {
        return;
      }
      settled = true;
      this.card.classList.add(IFRAME_CLASS);
      if (this.lastHost) {
        this.position(this.card, this.lastHost);
      }
    };
    const fail = () => {
      settled = true;
    };

    frame.onload = () => {
      const elapsed = performance.now() - startedAt;
      // A same-origin-policy read of the frame's document would tell us
      // for certain whether it rendered real content, but these are all
      // cross-origin targets by design - `contentDocument` is inaccessible.
      // Load speed is the only signal available without a server-side proxy.
      if (elapsed < MIN_REAL_LOAD_MS) {
        fail();
      } else {
        succeed();
      }
    };
    frame.onerror = fail;

    frame.src = url;
    setTimeout(fail, IFRAME_TIMEOUT_MS);
  }

  private ensureCard(): HTMLElement {
    if (this.card) {
      return this.card;
    }

    const card = document.createElement('div');
    card.className = 'link-preview-card';
    card.setAttribute('role', 'tooltip');

    this.iconEl = document.createElement('i');
    this.iconEl.setAttribute('aria-hidden', 'true');

    const text = document.createElement('div');
    text.className = 'link-preview-card__text';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'link-preview-card__title';

    this.domainEl = document.createElement('span');
    this.domainEl.className = 'link-preview-card__domain';

    text.append(this.titleEl, this.domainEl);

    const caption = document.createElement('div');
    caption.className = 'link-preview-card__caption';
    caption.append(this.iconEl, text);

    const frameWrap = document.createElement('div');
    frameWrap.className = 'link-preview-card__frame-wrap';

    this.frameEl = document.createElement('iframe');
    this.frameEl.className = 'link-preview-card__frame';
    this.frameEl.style.width = `${IFRAME_WIDTH}px`;
    this.frameEl.style.height = `${IFRAME_HEIGHT}px`;
    this.frameEl.style.transform = `scale(${IFRAME_SCALE})`;
    this.frameEl.setAttribute('tabindex', '-1');
    this.frameEl.setAttribute('aria-hidden', 'true');
    this.frameEl.setAttribute('referrerpolicy', 'no-referrer');
    // No `allow-top-navigation*` token: some sites defend against being
    // framed with a script that forces the *top* window to navigate away
    // (`top.location = ...`), not just an X-Frame-Options header. Sandboxing
    // without that token blocks such a script from hijacking the whole tab
    // regardless. No `allow-same-origin` either, so the framed page gets a
    // unique opaque origin each time - it can't read/write real cookies or
    // localStorage for that site, which also means it won't render as
    // "logged in" even if the visitor has a session with it elsewhere.
    this.frameEl.setAttribute('sandbox', 'allow-scripts');
    this.frameEl.src = 'about:blank';
    frameWrap.appendChild(this.frameEl);

    card.append(frameWrap, caption);
    document.body.appendChild(card);

    // The card's own position goes stale the moment the page scrolls (it's
    // `position: fixed` relative to the viewport, computed once on show from
    // the trigger's rect) - just hide it rather than tracking scroll deltas.
    window.addEventListener('scroll', () => this.hide(), { passive: true, capture: true });

    this.card = card;
    return card;
  }

  private position(card: HTMLElement, host: HTMLElement): void {
    const hostRect = host.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    let top = hostRect.top - cardRect.height - HOST_GAP;
    if (top < VIEWPORT_MARGIN) {
      top = hostRect.bottom + HOST_GAP;
    }

    const maxLeft = window.innerWidth - cardRect.width - VIEWPORT_MARGIN;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(hostRect.left + hostRect.width / 2 - cardRect.width / 2, maxLeft)
    );

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }
}
