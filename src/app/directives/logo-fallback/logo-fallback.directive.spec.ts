import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoFallbackDirective } from './logo-fallback.directive';

@Component({
  standalone: true,
  imports: [LogoFallbackDirective],
  template: `<img src="https://example.com/broken.png" [appLogoFallback]="'Voya Financial'">`,
})
class HostComponent { }

describe('LogoFallbackDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function img(): HTMLImageElement {
    return fixture.nativeElement.querySelector('img');
  }

  it('leaves the original src untouched until the image errors', () => {
    expect(img().src).toBe('https://example.com/broken.png');
  });

  it('swaps to a generated full-name SVG once the image fails to load', () => {
    img().dispatchEvent(new Event('error'));

    expect(img().src).toContain('data:image/svg+xml;utf8,');
    expect(img().src).toContain('Voya Financial');
  });

  it('only swaps once, even if the generated fallback somehow errors too', () => {
    img().dispatchEvent(new Event('error'));
    const fallbackSrc = img().src;

    img().dispatchEvent(new Event('error'));

    expect(img().src).toBe(fallbackSrc);
  });
});
