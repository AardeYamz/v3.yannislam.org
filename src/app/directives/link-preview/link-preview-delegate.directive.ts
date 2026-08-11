import { Directive, ElementRef, HostListener } from '@angular/core';
import { iconForUrl } from './link-preview-card';
import { LinkPreviewService } from './link-preview.service';

const TARGET_SELECTOR = 'a[href]';

// The banner blurb is rendered via [innerHTML] (see banner.component.html) -
// Angular never compiles that markup, so directives/host bindings placed
// directly on it (like LinkPreviewDirective) can't attach. Instead this sits
// on the real, Angular-rendered container around it and does plain-DOM event
// delegation over its <a> links (config.json's banner.blurb).
//
// Those links can only carry standard HTML attributes - Angular's innerHTML
// sanitizer strips anything else, including data-* - so unlike
// LinkPreviewDirective, the icon isn't passed in explicitly; it's guessed
// from the link's own domain (see iconForUrl).
@Directive({
  selector: '[appLinkPreviewDelegate]',
})
export class LinkPreviewDelegateDirective {
  constructor(private el: ElementRef<HTMLElement>, private previewService: LinkPreviewService) { }

  @HostListener('mouseover', ['$event'])
  @HostListener('focusin', ['$event'])
  onShow(event: Event): void {
    const target = this.findTarget(event.target);
    if (!target) {
      return;
    }

    const url = target.getAttribute('href') ?? '';
    this.previewService.show(target, {
      icon: iconForUrl(url),
      title: target.textContent?.trim() ?? '',
      url,
    });
  }

  @HostListener('mouseout', ['$event'])
  @HostListener('focusout', ['$event'])
  onHide(event: FocusEvent | MouseEvent): void {
    const leavingTarget = this.findTarget(event.target);
    if (!leavingTarget) {
      return;
    }

    // Moving between descendants of the same linked element (e.g. its text
    // node and itself) isn't actually leaving it - only hide once the
    // related element is genuinely outside it.
    const related = event.relatedTarget as Node | null;
    if (related && leavingTarget.contains(related)) {
      return;
    }

    this.previewService.hide();
  }

  private findTarget(eventTarget: EventTarget | null): HTMLElement | null {
    if (!(eventTarget instanceof HTMLElement)) {
      return null;
    }
    const match = eventTarget.closest<HTMLElement>(TARGET_SELECTOR);
    return match && this.el.nativeElement.contains(match) ? match : null;
  }
}
