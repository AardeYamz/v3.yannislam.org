import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

const STORAGE_KEY = 'yl-theme-mode';

function stubMatchMedia(matches: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({
    matches,
    addEventListener: () => { },
    removeEventListener: () => { },
  } as unknown as MediaQueryList);
}

describe('ThemeService', () => {
  let themeColorMeta: HTMLMetaElement;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');

    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    themeColorMeta.remove();
  });

  it('defaults to "default" mode when nothing is stored and the OS has no light preference', () => {
    stubMatchMedia(false);

    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('default');
    expect(service.logoVariant()).toBe('clearcolor');
  });

  it('resolves to "light" when the OS prefers light and nothing is stored', () => {
    stubMatchMedia(true);

    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('light');
    expect(service.logoVariant()).toBe('black');
  });

  it('prefers a stored choice over the current OS preference', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    stubMatchMedia(true); // OS says "light", but the stored choice should win

    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('dark');
    expect(service.logoVariant()).toBe('white');
  });

  it('ignores a stored value that is not one of the known modes', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-real-mode');
    stubMatchMedia(false);

    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('default');
  });

  it('cycles default -> light -> dark -> default and persists each choice', () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('default');

    service.cycle();
    expect(service.mode()).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

    service.cycle();
    expect(service.mode()).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    service.cycle();
    expect(service.mode()).toBe('default');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('default');
  });

  it('applies the data-theme attribute and theme-color meta tag to match the mode', () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);
    const appRef = TestBed.inject(ApplicationRef);
    appRef.tick();

    expect(document.documentElement.hasAttribute('data-theme')).toBeFalse();
    expect(themeColorMeta.getAttribute('content')).toBe('#131f31');

    service.cycle(); // -> light
    appRef.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(themeColorMeta.getAttribute('content')).toBe('#f4f1ea');

    service.cycle(); // -> dark
    appRef.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(themeColorMeta.getAttribute('content')).toBe('#05070c');
  });
});
