import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoFallbackBackgroundDirective } from './logo-fallback-background.directive';

@Component({
  standalone: true,
  imports: [LogoFallbackBackgroundDirective],
  template: `<div [appLogoFallbackBg]="src" [appLogoFallbackBgOrg]="'Chinese Baptist Church of Greater Boston'"></div>`,
})
class HostComponent {
  src = 'data:,';
}

describe('LogoFallbackBackgroundDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let originalImage: typeof Image;

  function div(): HTMLElement {
    return fixture.nativeElement.querySelector('div');
  }

  afterEach(() => {
    window.Image = originalImage;
  });

  function stubImage(behavior: 'load' | 'error'): void {
    originalImage = window.Image;
    class StubImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        Promise.resolve().then(() => {
          if (behavior === 'load') this.onload?.();
          else this.onerror?.();
        });
      }
    }
    window.Image = StubImage as unknown as typeof Image;
  }

  it('uses the real image as the background once it loads', async () => {
    stubImage('load');
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.src = 'https://example.com/logo.png';
    fixture.detectChanges();
    // The stubbed Image resolves via a microtask (Promise.resolve().then(...)),
    // not a timer, so awaiting a microtask turn is enough to flush it -
    // no fakeAsync/zone.js needed.
    await Promise.resolve();

    expect(div().style.backgroundImage).toContain('https://example.com/logo.png');
  });

  it('falls back to a generated full-name SVG background when the image fails to load', async () => {
    stubImage('error');
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await Promise.resolve();

    expect(div().style.backgroundImage).toContain('data:image/svg+xml;utf8,');
    expect(div().style.backgroundImage).toContain('Chinese Baptist');
  });
});
