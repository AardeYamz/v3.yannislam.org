import { Component, OnInit, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { wasServerPrerendered } from 'src/app/utils/hydration';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AppComponent implements OnInit {

  // Header is kept out of the DOM (see app.component.html's `@if`) until the
  // loading screen finishes: it mounts underneath that opaque, full-screen
  // overlay otherwise, so its :enter stagger animation plays out completely
  // hidden and is never actually seen. On the server this resolves
  // synchronously (LoadingScreenComponent has nothing to animate there), so
  // prerendered HTML always has the header already mounted.
  headerReady = false;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    // A hydrating client has to start with the same value the server
    // rendered - `false` here is only correct for a genuine cold client
    // bootstrap (no SSR involved). Otherwise Angular's hydration
    // reconciliation sees this `@if` block disagree with what the
    // prerendered DOM actually contains (the header IS there), which is
    // what caused the page to visibly flash: the already-rendered header
    // gets treated as a mismatch and the loading screen's onLoadingScreenFinished
    // path has to fire again from scratch to bring it back. LoadingScreenComponent
    // independently skips its own replay for the same reason (see its
    // skipAnimation field) - this covers the header side of the same bug.
    if (isPlatformBrowser(this.platformId) && wasServerPrerendered()) {
      this.headerReady = true;
    }
  }

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
