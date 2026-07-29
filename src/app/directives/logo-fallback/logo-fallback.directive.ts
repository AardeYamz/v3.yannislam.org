import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { buildFallbackLogoDataUri } from './logo-fallback';

// Swaps a broken/erroring <img> (non-200, CORS-blocked, dead link, etc.) for
// a generated initials placeholder, so third-party logo URLs rotting out
// from under us degrades gracefully instead of showing a broken-image icon.
@Directive({
  selector: 'img[appLogoFallback]',
})
export class LogoFallbackDirective {
  @Input('appLogoFallback') organization = '';

  private fellBack = false;

  constructor(private el: ElementRef<HTMLImageElement>) { }

  @HostListener('error')
  onError(): void {
    if (this.fellBack) {
      return;
    }
    this.fellBack = true;
    this.el.nativeElement.src = buildFallbackLogoDataUri(this.organization);
  }
}
