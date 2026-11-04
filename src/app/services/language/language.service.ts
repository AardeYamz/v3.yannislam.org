import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

export type Language = 'en' | 'zh';

export const LANGUAGE_STORAGE_KEY = 'yl-language';
// Hostname prefix that pins the Chinese edition (zh.yannislam.org).
const ZH_HOST_PREFIX = 'zh.';

// Which of the two copies of the page text (config.json / config.zh.json) is
// showing. Both editions are the same prerendered app, so the language is
// resolved in the browser: a saved choice wins, then zh.* hostnames are Chinese,
// and everything else is English.
//
// The server and the first client render always use English so hydration
// matches the prerendered HTML; init() then switches (AppComponent calls it
// after the first render, while the loading screen still covers the page).
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly languageSignal = signal<Language>('en');
  readonly language = this.languageSignal.asReadonly();

  init(): void {
    if (!this.isBrowser) return;
    this.languageSignal.set(this.resolveInitialLanguage());
  }

  toggle(): Language {
    const next: Language = this.languageSignal() === 'en' ? 'zh' : 'en';
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for the visit only.
    }
    this.languageSignal.set(next);
    return next;
  }

  /** Keeps <html lang> and the title/description tags in step with the language. */
  applyToDocument(lang: Language, ui: { title: string; description: string }): void {
    if (!this.isBrowser) return;
    this.document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    this.title.setTitle(ui.title);
    this.meta.updateTag({ name: 'title', content: ui.title });
    this.meta.updateTag({ name: 'description', content: ui.description });
    this.meta.updateTag({ property: 'og:title', content: ui.title });
    this.meta.updateTag({ property: 'og:description', content: ui.description });
    this.meta.updateTag({ property: 'twitter:title', content: ui.title });
    this.meta.updateTag({ property: 'twitter:description', content: ui.description });
  }

  private resolveInitialLanguage(): Language {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // see toggle()
    }
    if (stored === 'en' || stored === 'zh') return stored;

    return window.location.hostname.toLowerCase().startsWith(ZH_HOST_PREFIX) ? 'zh' : 'en';
  }
}
