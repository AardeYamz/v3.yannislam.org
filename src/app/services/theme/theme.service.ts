import { Injectable, computed, effect, signal } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly modeSignal = signal<ThemeMode>(this.resolveInitialMode());
  readonly mode = this.modeSignal.asReadonly();
  readonly logoVariant = computed<'clearcolor' | 'black' | 'white'>(() => {
    switch (this.modeSignal()) {
      case 'light': return 'black';
      case 'dark': return 'white';
      default: return 'clearcolor';
    }
  });

  constructor() {
    effect(() => this.applyToDom(this.modeSignal()));

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
    localStorage.setItem(STORAGE_KEY, next);
    this.modeSignal.set(next);
  }

  private resolveInitialMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if ((CYCLE_ORDER as string[]).includes(stored ?? '')) {
      return stored as ThemeMode;
    }
    return window.matchMedia(PREFERS_LIGHT_QUERY).matches ? 'light' : 'default';
  }

  private applyToDom(mode: ThemeMode): void {
    if (mode === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', NAVY_BY_MODE[mode]);
  }
}
