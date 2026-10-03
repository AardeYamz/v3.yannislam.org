import { Injectable } from '@angular/core';
import config from '../../../assets/config.json';
import {
  Contact,
  Experiences,
  FooterConfig,
  Logo,
  MenuItem,
  ProjectsConfig,
  SiteConfig,
} from './site-config.model';

// Single point of access for src/assets/config.json so components don't each
// carry their own relative import of it (paths that broke every time a
// component moved a folder deeper/shallower).
@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  readonly data: SiteConfig = config as SiteConfig;
  readonly logos: Record<string, Logo> = this.data.logos;
  // AardeYamz is an easter egg route: it stays in config.json (and is still
  // reachable by navigating to /aardeyamz directly) but is marked "hidden"
  // so it's filtered out of the rendered nav.
  readonly menu: MenuItem[] = this.data.siteMenu.filter((item) => !item.hidden);
  readonly experiences: Experiences = this.resolveLogoKeys(this.data.about.experiences);
  readonly contacts: Contact[] = this.data.about.contact;
  readonly projects: ProjectsConfig = this.resolveLogoKeys(this.data.projects);
  readonly footer: FooterConfig = this.data.footer;

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
  private resolveLogoKeys<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveLogoKeys(item)) as T;
    }
    if (value && typeof value === 'object') {
      const resolved = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, child]) => [key, this.resolveLogoKeys(child)])
      ) as T;

      const logoKey = (resolved as { logoKey?: unknown }).logoKey;
      if (typeof logoKey === 'string') {
        const logo = this.logos[logoKey];
        if (logo) {
          return { ...resolved, imgs: [logo.src], image_alt: logo.alt };
        }
      }
      return resolved;
    }
    return value;
  }
}
