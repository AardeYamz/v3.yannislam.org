import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'default' | 'light' | 'dark';

const STORAGE_KEY = 'yl-theme-mode';
const CYCLE_ORDER: ThemeMode[] = ['default', 'light', 'dark'];
// 'default' is already a dark theme, so it's the system-dark counterpart —
// there's no separate OS signal for the deepest 'dark' mode.
const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)';
// Mirrors --color-navy per mode from theme.scss — used to keep the browser
// chrome (address bar on mobile) in sync with the actual page background.
const NAVY_BY_MODE: Record<ThemeMode, string> = {
  default: '#131f31',
  light: '#f4f1ea',
  dark: '#05070c'
};
// Mirrors --color-orange per mode from theme.scss — used by things like the
// generated logo-fallback placeholder that can't read CSS custom properties
// because they're rendered into a static SVG data URI, not the live DOM.
const ORANGE_BY_MODE: Record<ThemeMode, string> = {
  default: '#ffa500',
  light: '#d9720c',
  dark: '#ffb020'
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  // `window`/`localStorage`/`document` don't exist during server-side
  // prerendering (Node has no DOM), so every touch of them below is gated
  // on this flag and falls back to a fixed default on the server.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly modeSignal = signal<ThemeMode>(this.resolveInitialMode());
  readonly mode = this.modeSignal.asReadonly();
  readonly logoVariant = computed<'clearcolor' | 'black' | 'white'>(() => {
    switch (this.modeSignal()) {
      case 'light': return 'black';
      case 'dark': return 'white';
      default: return 'clearcolor';
    }
  });
  readonly accentColor = computed(() => ORANGE_BY_MODE[this.modeSignal()]);

  constructor() {
    effect(() => this.applyToDom(this.modeSignal()));

    if (!this.isBrowser) return;

    // Follow the OS setting live as long as the user hasn't made an
    // explicit choice (i.e. nothing saved yet) — once they click the logo,
    // that choice is stored and wins over the system preference from then on.
    window.matchMedia(PREFERS_LIGHT_QUERY).addEventListener('change', (event) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      this.modeSignal.set(event.matches ? 'light' : 'default');
    });
  }

  cycle(): void {
    const nextIndex = (CYCLE_ORDER.indexOf(this.modeSignal()) + 1) % CYCLE_ORDER.length;
    const next = CYCLE_ORDER[nextIndex];
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, next);
    }
    this.modeSignal.set(next);
  }

  private resolveInitialMode(): ThemeMode {
    if (!this.isBrowser) return 'default';

    const stored = localStorage.getItem(STORAGE_KEY);
    if ((CYCLE_ORDER as string[]).includes(stored ?? '')) {
      return stored as ThemeMode;
    }
    return window.matchMedia(PREFERS_LIGHT_QUERY).matches ? 'light' : 'default';
  }

  private applyToDom(mode: ThemeMode): void {
    if (!this.isBrowser) return;

    if (mode === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', NAVY_BY_MODE[mode]);
  }
}
