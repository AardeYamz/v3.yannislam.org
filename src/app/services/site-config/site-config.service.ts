import { Injectable } from '@angular/core';
import * as siteConfig from '../../../assets/config.json';

// Single point of access for src/assets/config.json so components don't each
// carry their own relative import of it (paths that broke every time a
// component moved a folder deeper/shallower).
@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  readonly data: any = siteConfig;
  readonly menu: any[] = this.data.siteMenu;
  readonly experiences: any = this.data.about.experiences;
  readonly contacts: any[] = this.data.about.contact;
  readonly projects: any = this.data.projects;
}
