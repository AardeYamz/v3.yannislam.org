import config from '../../../assets/config.json';
import type { Language } from '../language/language.service';
import type { SiteConfig } from './site-config.model';

// Only the English config ships in the main bundle. The translations are
// separate lazy chunks, fetched when their language is first chosen, so a
// visitor downloads one language and not all three.
const loaded: Partial<Record<Language, SiteConfig>> = { en: config as SiteConfig };

/** The config for `lang`, or English if that translation has not been loaded yet. */
export function loadedConfig(lang: Language): SiteConfig {
  return loaded[lang] ?? loaded.en!;
}

/** Fetches the translation for `lang` (a no-op once loaded). */
export async function loadConfig(lang: Language): Promise<void> {
  if (loaded[lang]) return;
  const module = await import('../../../assets/config.zh.json');
  loaded[lang] = module.default as SiteConfig;
}
