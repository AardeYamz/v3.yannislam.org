import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { domainFromUrl, isPreviewableUrl, LinkPreviewData } from './link-preview-card';

const VISIBLE_CLASS = 'link-preview-card--visible';
const VIEWPORT_MARGIN = 8;
const HOST_GAP = 10;

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

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  show(host: HTMLElement, data: LinkPreviewData | null | undefined): void {
    if (!this.isBrowser || !data || !isPreviewableUrl(data.url)) {
      return;
    }

    const card = this.ensureCard();
    this.iconEl.className = data.icon;
    this.titleEl.textContent = data.title;
    this.domainEl.textContent = domainFromUrl(data.url);

    this.position(card, host);
    card.classList.add(VISIBLE_CLASS);
  }

  hide(): void {
    this.card?.classList.remove(VISIBLE_CLASS);
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
    card.append(this.iconEl, text);
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
