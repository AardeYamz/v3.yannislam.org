import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { LinkPreviewData } from './link-preview-card';
import { LinkPreviewService } from './link-preview.service';

// For elements Angular itself compiles (e.g. the footer's social links,
// bound directly in the template) - straightforward host bindings, no
// delegation needed. See LinkPreviewDelegateDirective for the innerHTML
// counterpart used by the banner blurb.
@Directive({
  selector: '[appLinkPreview]',
})
export class LinkPreviewDirective {
  @Input('appLinkPreview') data: LinkPreviewData | null = null;

  constructor(private el: ElementRef<HTMLElement>, private previewService: LinkPreviewService) { }

  @HostListener('mouseenter')
  @HostListener('focus')
  onShow(): void {
    this.previewService.show(this.el.nativeElement, this.data);
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  onHide(): void {
    this.previewService.hide();
  }
}
