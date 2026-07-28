import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';

@Directive({
  selector: '[data-aos]',
})
export class AosDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) { }

  ngAfterViewInit(): void {
    const element = this.el.nativeElement;
    const duration = element.getAttribute('data-aos-duration');
    if (duration) {
      element.style.transitionDuration = `${duration}ms`;
    }

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
