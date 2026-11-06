import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { loadConfig } from '../site-config/config-loader';

export type Language = 'en' | 'zh';
export const LANGUAGES: readonly Language[] = ['en', 'zh'];

// Each language's own name, shown in the language buttons' labels.
const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  zh: '简体中文',
};
export const languageName = (lang: Language): string => LANGUAGE_NAMES[lang];

// <html lang> value for each language.
const HTML_LANG: Record<Language, string> = { en: 'en', zh: 'zh-Hans' };
export const htmlLang = (lang: Language): string => HTML_LANG[lang];

export const LANGUAGE_STORAGE_KEY = 'yl-language';
// Hostname prefixes that pin an edition (zh.yannislam.org).
const HOST_PREFIXES: Record<string, Language> = { 'zh.': 'zh' };

// Time zones (IANA ids) that default the page to Chinese when the browser's
// language list doesn't already say so. The time zone is the only "where are you"
// signal available without an IP lookup or sending anything to a third party.
const ZH_TIME_ZONES = new Set([
  'Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'PRC',
]);

/**
 * The language to show a visitor who has not chosen one: a Chinese entry in the
 * browser's language list wins, otherwise a Chinese-speaking region's time zone
 * does, otherwise English (so a visitor in the US gets English).
 */
export function detectLanguage(languages: readonly string[], timeZone: string): Language {
  if (languages.some((tag) => tag.toLowerCase().startsWith('zh'))) return 'zh';
  return ZH_TIME_ZONES.has(timeZone) ? 'zh' : 'en';
}

// Which copy of the page text (config.json / config.zh.json) is
// showing. Both editions are the same prerendered app, so the language is
// resolved in the browser: a saved choice wins, then a zh.* hostname, then the
// visitor's browser languages and time zone (detectLanguage), else English.
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

  async init(): Promise<void> {
    if (!this.isBrowser) return;
    await this.set(this.resolveInitialLanguage());
  }

  // Fetches the language's text first, so the page never renders half-switched.
  private async set(lang: Language): Promise<void> {
    try {
      await loadConfig(lang);
    } catch {
      return; // offline: stay on the current language
    }
    this.languageSignal.set(lang);
  }

  async select(next: Language): Promise<void> {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for the visit only.
    }
    await this.set(next);
  }

  /** Keeps <html lang> and the title/description tags in step with the language. */
  applyToDocument(lang: Language, ui: { title: string; description: string }): void {
    if (!this.isBrowser) return;
    this.document.documentElement.lang = HTML_LANG[lang];
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
    if (LANGUAGES.includes(stored as Language)) return stored as Language;

    const host = window.location.hostname.toLowerCase();
    const pinned = Object.entries(HOST_PREFIXES).find(([prefix]) => host.startsWith(prefix));
    if (pinned) return pinned[1];

    let timeZone = '';
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
      // No Intl time zone: fall back on the browser languages alone.
    }
    return detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language ?? ''], timeZone);
  }
}
