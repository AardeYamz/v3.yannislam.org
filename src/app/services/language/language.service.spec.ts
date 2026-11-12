import { TestBed } from '@angular/core/testing';

import { LANGUAGE_STORAGE_KEY, LanguageService, detectLanguage } from './language.service';
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

  it('select() switches language and remembers the choice', async () => {
    await service.select('zh');
    expect(service.language()).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
    await service.select('hk');
    expect(service.language()).toBe('hk');
    await service.select('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('init() restores a saved choice', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
    await service.init();
    expect(service.language()).toBe('zh');
  });

  it('applyToDocument() sets <html lang> and the title', () => {
    service.applyToDocument('zh', { title: '林恩力', description: '作品集' });
    expect(document.documentElement.lang).toBe('zh-Hans');
    expect(document.title).toBe('林恩力');
    service.applyToDocument('hk', { title: '林恩力', description: '作品集' });
    expect(document.documentElement.lang).toBe('zh-Hant-HK');
    service.applyToDocument('en', { title: 'Yannis Lam', description: 'Portfolio' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('SiteConfigService follows the language', async () => {
    const config = TestBed.inject(SiteConfigService);
    expect(config.menu[0].navTitle).toBe('About');
    await service.select('zh');
    expect(config.menu[0].navTitle).toBe('关于');
    await service.select('hk');
    expect(config.menu[0].navTitle).toBe('關於');
    await service.select('mx');
    expect(config.menu[0].navTitle).toBe('Acerca de');
  });

  it('detectLanguage() picks English for the US and Chinese for Chinese locales or regions', () => {
    expect(detectLanguage(['en-US', 'en'], 'America/New_York')).toBe('en');
    expect(detectLanguage(['en-US'], 'Asia/Shanghai')).toBe('zh');
    expect(detectLanguage(['zh-CN'], 'America/New_York')).toBe('zh');
    expect(detectLanguage(['en-US', 'zh-CN'], 'America/Los_Angeles')).toBe('zh');
    expect(detectLanguage(['zh-HK', 'en'], 'America/New_York')).toBe('hk');
    expect(detectLanguage(['zh-Hant-TW'], 'Asia/Taipei')).toBe('hk');
    expect(detectLanguage(['en-US'], 'Asia/Hong_Kong')).toBe('hk');
    expect(detectLanguage(['es-MX', 'en'], 'America/Chicago')).toBe('mx');
    expect(detectLanguage(['en-US', 'es'], 'America/Chicago')).toBe('mx');
    expect(detectLanguage(['en-US'], 'America/Mexico_City')).toBe('mx');
    expect(detectLanguage([], '')).toBe('en');
  });
});
