import { Injectable } from '@angular/core';
import * as siteConfig from '../../../assets/config.json';

interface Logo {
  src: string;
  alt: string;
}

// Single point of access for src/assets/config.json so components don't each
// carry their own relative import of it (paths that broke every time a
// component moved a folder deeper/shallower).
@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  readonly data: any = siteConfig;
  readonly logos: Record<string, Logo> = this.data.logos;
  // AardeYamz is an easter egg route: it stays in config.json (and is still
  // reachable by navigating to /aardeyamz directly) but is marked "hidden"
  // so it's filtered out of the rendered nav.
  readonly menu: any[] = this.data.siteMenu.filter((item: any) => !item.hidden);
  readonly experiences: any = this.resolveLogoKeys(this.data.about.experiences);
  readonly contacts: any[] = this.data.about.contact;
  readonly projects: any = this.resolveLogoKeys(this.data.projects);
  readonly footer: any = this.data.footer;

  // Entries reference a shared logo by "logoKey" instead of repeating the
  // same image URL/alt text everywhere (config.json's "logos" map). Expand
  // that reference into the "imgs"/"image_alt" shape components already
  // consume, so WorkHistoryComponent etc. don't need to know logos are
  // deduplicated.
  private resolveLogoKeys(value: any): any {
    if (Array.isArray(value)) {
      value.forEach(item => this.resolveLogoKeys(item));
      return value;
    }
    if (value && typeof value === 'object') {
      if (typeof value.logoKey === 'string') {
        const logo = this.logos[value.logoKey];
        if (logo) {
          value.imgs = [logo.src];
          value.image_alt = logo.alt;
        }
      }
      Object.values(value).forEach(child => this.resolveLogoKeys(child));
    }
    return value;
  }
}
