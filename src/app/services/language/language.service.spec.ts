import { TestBed } from '@angular/core/testing';

import { LANGUAGE_STORAGE_KEY, LanguageService } from './language.service';
import { SiteConfigService } from '../site-config/site-config.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY));

  it('starts in English so the first render matches the prerendered HTML', () => {
    expect(service.language()).toBe('en');
  });

  it('toggle() switches language and remembers the choice', () => {
    expect(service.toggle()).toBe('zh');
    expect(service.language()).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
    expect(service.toggle()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('init() restores a saved choice', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
    service.init();
    expect(service.language()).toBe('zh');
  });

  it('applyToDocument() sets <html lang> and the title', () => {
    service.applyToDocument('zh', { title: '林恩力', description: '作品集' });
    expect(document.documentElement.lang).toBe('zh-Hans');
    expect(document.title).toBe('林恩力');
    service.applyToDocument('en', { title: 'Yannis Lam', description: 'Portfolio' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('SiteConfigService follows the language', () => {
    const config = TestBed.inject(SiteConfigService);
    expect(config.menu[0].navTitle).toBe('About');
    service.toggle();
    expect(config.menu[0].navTitle).toBe('关于');
    expect(config.ui.header.languageButton).toBe('EN');
  });
});
