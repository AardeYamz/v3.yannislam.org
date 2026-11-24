import { afterNextRender, Directive, ElementRef, inject, input } from '@angular/core';

// Entrance animation shared by the header, banner and footer: staggers each
// matched element in from `appFadeStaggerFrom` while fading in, then settles
// in place. Replaces the deprecated @angular/animations fadeStagger trigger
// with the Web Animations API, so nothing extra ships.
//
// `appFadeStaggerSelector` defaults to '*' (every descendant, at any depth),
// fine for banner/footer's shallow markup. The header passes a narrower one:
// its markup duplicates every nav item inside the mobile drawer
// (.menu-responsive) and always includes the desktop-only nav list, both
// hidden via CSS depending on viewport width but still present in the DOM, so
// `*` would give their ~40 descendants a 50ms stagger slot each ahead of the
// theme toggle and menu-toggle button. On mobile that left the menu toggle at
// opacity 0 for over a second. Staggering just the top-level chrome groups
// (`.container > *`) still reads as a staggered entrance.
@Directive({ selector: '[appFadeStagger]' })
export class FadeStaggerDirective {
  readonly from = input.required<string>({ alias: 'appFadeStagger' });
  readonly selector = input('*', { alias: 'appFadeStaggerSelector' });

  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // Browser only: afterNextRender never runs during prerendering, so the
    // static HTML stays fully visible.
    afterNextRender(() => {
      const from = this.from();
      this.host.querySelectorAll<HTMLElement>(this.selector()).forEach((el, i) => {
        if (typeof el.animate !== 'function') return;
        el.animate(
          [
            { opacity: 0, transform: from },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 250, delay: i * 50, easing: 'cubic-bezier(0.35, 0, 0.25, 1)', fill: 'backwards' },
        );
      });
    });
  }
}
