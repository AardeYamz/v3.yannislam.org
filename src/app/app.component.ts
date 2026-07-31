import { Component, OnInit, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit {

  // Header is kept out of the DOM (see app.component.html's `@if`) until the
  // loading screen finishes: it mounts underneath that opaque, full-screen
  // overlay otherwise, so its :enter stagger animation plays out completely
  // hidden and is never actually seen.
  headerReady = false;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: object,
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle("Yannis Lam");
    this.metaService.addTags([
      { name: 'keywords', content: 'Web, software, developer, portfolio, resume, photography' },
      { name: 'description', content: 'Yannis Lam Personal Website' },
    ]);

    // Vercel Web Analytics + Speed Insights, additive to the existing
    // gtag.js-based AnalyticsService (see analytics.service.ts). Both
    // `inject()` calls are already no-ops when `window` is undefined, but
    // this app currently has no SSR, so the isPlatformBrowser() guard is
    // just defensive belt-and-braces should that change later.
    if (isPlatformBrowser(this.platformId)) {
      injectVercelAnalytics();
      injectSpeedInsights();
    }
  }

  onLoadingScreenFinished(): void {
    this.headerReady = true;
  }
}
