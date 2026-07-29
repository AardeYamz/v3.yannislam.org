import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AosDirective } from './aos.directive';

@Component({
  standalone: true,
  imports: [AosDirective],
  template: `<div data-aos="fade-up" data-aos-duration="500"></div>`,
})
class HostComponent { }

describe('AosDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let observedCallback: IntersectionObserverCallback;
  let disconnectSpy: jasmine.Spy;
  let observeSpy: jasmine.Spy;

  beforeEach(() => {
    disconnectSpy = jasmine.createSpy('disconnect');
    observeSpy = jasmine.createSpy('observe');

    const fakeIntersectionObserver = function (
      this: any,
      callback: IntersectionObserverCallback
    ) {
      observedCallback = callback;
      this.observe = observeSpy;
      this.disconnect = disconnectSpy;
    } as unknown as typeof IntersectionObserver;

    spyOn(window, 'IntersectionObserver').and.callFake(fakeIntersectionObserver as any);

    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-aos]');
  }

  function intersect(isIntersecting: boolean): void {
    observedCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  }

  it('applies data-aos-duration as a transition-duration style', () => {
    expect(element().style.transitionDuration).toBe('500ms');
  });

  it('starts observing the host element', () => {
    expect(observeSpy).toHaveBeenCalledWith(element());
  });

  it('adds the aos-animate class once the element intersects the viewport', () => {
    expect(element().classList.contains('aos-animate')).toBeFalse();

    intersect(true);

    expect(element().classList.contains('aos-animate')).toBeTrue();
  });

  it('removes the aos-animate class once the element leaves the viewport', () => {
    intersect(true);
    expect(element().classList.contains('aos-animate')).toBeTrue();

    intersect(false);

    expect(element().classList.contains('aos-animate')).toBeFalse();
  });

  it('disconnects the observer when the host is destroyed', () => {
    fixture.destroy();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
