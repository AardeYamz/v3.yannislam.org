import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export const SITE_ORIGIN = 'https://yannislam.org';

/**
 * Keeps the canonical URL and the og:url / twitter:url tags in step with the
 * current route. index.html is one template shared by every prerendered route,
 * so without this each page would declare the home page as its canonical.
 * The tags already exist in index.html; this only updates their values (never
 * adds duplicates), which is why AppComponent's "do not touch the meta tags"
 * note still holds for the title and description.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private router = inject(Router);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  /** Start following navigations. Call once, from AppComponent. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.update(e.urlAfterRedirects));
  }

  /** Absolute URL for a router URL; the root stays the bare origin. */
  static canonicalFor(url: string): string {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return path ? SITE_ORIGIN + path : SITE_ORIGIN;
  }

  update(url: string): void {
    const canonical = SeoService.canonicalFor(url);
    this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    this.meta.updateTag({ property: 'og:url', content: canonical }, "property='og:url'");
    this.meta.updateTag({ property: 'twitter:url', content: canonical }, "property='twitter:url'");
  }
}
