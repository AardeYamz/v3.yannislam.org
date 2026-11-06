import { Injectable, inject } from '@angular/core';
import { Language, LanguageService } from '../language/language.service';
import { loadedConfig } from './config-loader';
import {
  Contact,
  Experiences,
  FooterConfig,
  Logo,
  MenuItem,
  ProjectsConfig,
  SiteConfig,
  UiStrings,
} from './site-config.model';

// Everything one language's config.json produces, derived once and cached.
interface Edition {
  data: SiteConfig;
  logos: Record<string, Logo>;
  menu: MenuItem[];
  experiences: Experiences;
  contacts: Contact[];
  projects: ProjectsConfig;
  footer: FooterConfig;
}

// Single point of access for src/assets/config.json (English) and
// src/assets/config.zh.json (Simplified Chinese) so components don't each
// carry their own relative import of them (paths that broke every time a
// component moved a folder deeper/shallower).
//
// Every accessor reads LanguageService's signal, so a template that reads
// one re-renders when the language is switched. Components must therefore
// read these through getters, not copy them into fields once.
@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  private readonly languageService = inject(LanguageService);
  private readonly editions = new Map<Language, Edition>();

  private get edition(): Edition {
    const lang = this.languageService.language();
    let edition = this.editions.get(lang);
    if (!edition) {
      edition = this.buildEdition(loadedConfig(lang));
      this.editions.set(lang, edition);
    }
    return edition;
  }

  get data(): SiteConfig { return this.edition.data; }
  get logos(): Record<string, Logo> { return this.edition.logos; }
  // AardeYamz is an easter egg route: it stays in config.json (and is still
  // reachable by navigating to /aardeyamz directly) but is marked "hidden"
  // so it's filtered out of the rendered nav.
  get menu(): MenuItem[] { return this.edition.menu; }
  get experiences(): Experiences { return this.edition.experiences; }
  get contacts(): Contact[] { return this.edition.contacts; }
  get projects(): ProjectsConfig { return this.edition.projects; }
  get footer(): FooterConfig { return this.edition.footer; }
  get ui(): UiStrings { return this.edition.data.ui; }

  private buildEdition(data: SiteConfig): Edition {
    const logos = data.logos;
    return {
      data,
      logos,
      menu: data.siteMenu.filter((item) => !item.hidden),
      experiences: this.resolveLogoKeys(data.about.experiences, logos, data.logoAbout),
      contacts: data.about.contact,
      projects: this.resolveLogoKeys(data.projects, logos, data.logoAbout),
      footer: data.footer,
    };
  }

  // Entries reference a shared logo by "logoKey" instead of repeating the
  // same image URL/alt text everywhere (config.json's "logos" map). Expand
  // that reference into the "imgs"/"image_alt" shape components already
  // consume, so WorkHistoryComponent etc. don't need to know logos are
  // deduplicated.
  //
  // Returns a new value rather than mutating `value` in place: the input is
  // (transitively) the imported config.json module, and mutating a module's
  // object graph is the kind of surprise that breaks HMR and makes tests
  // depend on run order. A one-time deep clone at startup is cheap for data
  // this size.
  private resolveLogoKeys<T>(value: T, logos: Record<string, Logo>, logoAbout?: Record<string, string>): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveLogoKeys(item, logos, logoAbout)) as T;
    }
    if (value && typeof value === 'object') {
      const resolved = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, child]) => [key, this.resolveLogoKeys(child, logos, logoAbout)])
      ) as T;

      const logoKey = (resolved as { logoKey?: unknown }).logoKey;
      if (typeof logoKey === 'string') {
        const logo = logos[logoKey];
        // An entry's own "about" wins; otherwise use the blurb shared by
        // every entry with this logoKey ("logoAbout"), so e.g. the three
        // Voya roles don't each repeat the company description.
        const about = (resolved as { about?: unknown }).about ?? logoAbout?.[logoKey];
        if (logo) {
          return { ...resolved, imgs: [logo.src], image_alt: logo.alt, ...(about !== undefined && { about }) };
        }
      }
      return resolved;
    }
    return value;
  }
}
