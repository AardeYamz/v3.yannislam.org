import { AfterViewInit, Directive, ElementRef, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[data-aos]',
})
export class AosDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private readonly isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    const element = this.el.nativeElement;
    const duration = element.getAttribute('data-aos-duration');
    if (duration) {
      element.style.transitionDuration = `${duration}ms`;
    }

    // `IntersectionObserver` doesn't exist in Node/Domino during server-side
    // prerendering, so scroll-triggered reveal is skipped there — the element
    // still renders with its real content, just without the animate-in state,
    // and the browser sets it up for real once the client hydrates.
    if (!this.isBrowser) return;

    this.observer = new IntersectionObserver(
      ([entry]) => element.classList.toggle('aos-animate', entry.isIntersecting),
      { threshold: 0.1, rootMargin: '0px 0px -120px 0px' }
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
