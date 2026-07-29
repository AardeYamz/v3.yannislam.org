import { Directive, effect, ElementRef, HostListener, Input } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { buildFallbackLogoDataUri } from './logo-fallback';

// Swaps a broken/erroring <img> (non-200, CORS-blocked, dead link, etc.) for
// a generated full-name placeholder, so third-party logo URLs rotting out
// from under us degrades gracefully instead of showing a broken-image icon.
// The placeholder is a static SVG data URI, so it can't pick up
// --color-orange via CSS when the theme changes — re-render it explicitly
// whenever the theme's accent color changes instead.
@Directive({
  selector: 'img[appLogoFallback]',
})
export class LogoFallbackDirective {
  @Input('appLogoFallback') organization = '';

  private fellBack = false;

  constructor(private el: ElementRef<HTMLImageElement>, private themeService: ThemeService) {
    effect(() => {
      const color = this.themeService.accentColor();
      if (this.fellBack) {
        this.el.nativeElement.src = buildFallbackLogoDataUri(this.organization, color);
      }
    });
  }

  @HostListener('error')
  onError(): void {
    if (this.fellBack) {
      return;
    }
    this.fellBack = true;
    this.el.nativeElement.src = buildFallbackLogoDataUri(this.organization, this.themeService.accentColor());
  }
}
