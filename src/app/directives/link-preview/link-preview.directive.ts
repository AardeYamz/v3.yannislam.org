import { Directive, ElementRef, inject, input } from '@angular/core';
import { LinkPreviewData } from './link-preview-card';
import { LinkPreviewService } from './link-preview.service';

// For elements Angular itself compiles (e.g. the footer's social links,
// bound directly in the template) - straightforward host bindings, no
// delegation needed. See LinkPreviewDelegateDirective for the innerHTML
// counterpart used by the banner blurb.
@Directive({
  selector: '[appLinkPreview]',
  host: {
    '(mouseenter)': 'onShow()',
    '(focus)': 'onShow()',
    '(mouseleave)': 'onHide()',
    '(blur)': 'onHide()',
  },
})
export class LinkPreviewDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private previewService = inject(LinkPreviewService);

  readonly data = input<LinkPreviewData | null>(null, { alias: "appLinkPreview" });

  onShow(): void {
    this.previewService.show(this.el.nativeElement, this.data());
  }

  onHide(): void {
    this.previewService.hide();
  }
}
