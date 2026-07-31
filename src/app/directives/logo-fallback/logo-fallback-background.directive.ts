import { Directive, effect, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { buildFallbackLogoDataUri } from './logo-fallback';

// Background-image counterpart to LogoFallbackDirective. CSS background-image
// has no error event, so a dead/placeholder logo URL (e.g. config.json's
// "data:," sentinel for orgs without a logo) just renders as an empty
// background instead of degrading gracefully like the foreground <img> tiles
// do. Probe the URL with a throwaway Image() and swap to the same generated
// placeholder SVG on failure, so the watermark background matches the logo.
@Directive({
  selector: '[appLogoFallbackBg]',
})
export class LogoFallbackBackgroundDirective implements OnChanges {
  @Input('appLogoFallbackBg') src = '';
  @Input() appLogoFallbackBgOrg = '';

  private failed = false;

  constructor(private el: ElementRef<HTMLElement>, private themeService: ThemeService) {
    effect(() => {
      const color = this.themeService.accentColor();
      if (this.failed) {
        this.setBackground(buildFallbackLogoDataUri(this.appLogoFallbackBgOrg, color));
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src']) {
      this.failed = false;
      this.probe(this.src);
    }
  }

  private probe(src: string): void {
    const image = new Image();
    image.onload = () => {
      if (!this.failed) {
        this.setBackground(src);
      }
    };
    image.onerror = () => {
      this.failed = true;
      this.setBackground(buildFallbackLogoDataUri(this.appLogoFallbackBgOrg, this.themeService.accentColor()));
    };
    image.src = src;
  }

  private setBackground(url: string): void {
    // The generated SVG data URI contains raw '<', '>' and "'" characters,
    // which make an unquoted url(...) invalid CSS (silently dropped by the
    // browser) - quote it, escaping the quote character itself just in case.
    const safeUrl = url.replace(/\\/g, '%5C').replace(/"/g, '%22');
    this.el.nativeElement.style.backgroundImage = `url("${safeUrl}")`;
  }
}
