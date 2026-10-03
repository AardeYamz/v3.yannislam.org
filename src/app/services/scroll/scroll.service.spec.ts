import { TestBed } from '@angular/core/testing';

import { ScrollService } from './scroll.service';

describe('ScrollService', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('reads the initial scroll position on construction', () => {
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });

    const service = TestBed.inject(ScrollService);

    expect(service.y()).toBe(120);
  });

  it('computes maxScroll from scrollHeight and innerHeight', () => {
    spyOnProperty(document.documentElement, 'scrollHeight').and.returnValue(3000);
    spyOnProperty(window, 'innerHeight').and.returnValue(800);

    const service = TestBed.inject(ScrollService);

    expect(service.maxScroll()).toBe(2200);
  });

  it('never goes negative on a page shorter than the viewport', () => {
    spyOnProperty(document.documentElement, 'scrollHeight').and.returnValue(400);
    spyOnProperty(window, 'innerHeight').and.returnValue(800);

    const service = TestBed.inject(ScrollService);

    expect(service.maxScroll()).toBe(0);
  });

  it('updates y from a window scroll event, throttled to one write per animation frame', (done) => {
    const service = TestBed.inject(ScrollService);
    Object.defineProperty(window, 'scrollY', { value: 250, configurable: true });

    window.dispatchEvent(new Event('scroll'));

    requestAnimationFrame(() => {
      expect(service.y()).toBe(250);
      done();
    });
  });

  it('recomputes maxScroll on a window resize event', (done) => {
    const heightSpy = spyOnProperty(document.documentElement, 'scrollHeight').and.returnValue(1000);
    spyOnProperty(window, 'innerHeight').and.returnValue(800);

    const service = TestBed.inject(ScrollService);
    expect(service.maxScroll()).toBe(200);

    heightSpy.and.returnValue(2000);
    window.dispatchEvent(new Event('resize'));

    // recomputeMaxScroll runs synchronously off the resize event, but give
    // it a tick so this test isn't coupled to that being true forever.
    setTimeout(() => {
      expect(service.maxScroll()).toBe(1200);
      done();
    });
  });
});
