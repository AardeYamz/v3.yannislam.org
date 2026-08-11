import { Component, OnInit, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  // hidden and is never actually seen. For a genuine cold client bootstrap
  // that's exactly right, and this field's `false` default handles it -
  // onLoadingScreenFinished() flips it once the real animation completes.
  //
  // Two other cases need `headerReady` true immediately instead, set below:
  // server rendering (nothing animates there at all - LoadingScreenComponent
  // never even calls playIntro()/playOutro() server-side, so nothing would
  // ever flip this if it waited on the event) and a client hydrating that
  // server output (needs to start matching what the server rendered, or
  // Angular's hydration reconciliation sees this `@if` block disagree with
  // what the prerendered DOM actually contains). Both keep the header (and
  // everything under router-outlet, which isn't gated at all) present in
  // the HTML for SEO/crawlability, independent of whether the loading
  // screen's animation has visually finished - that overlay covers the
  // whole viewport (z-index 9999) regardless, so it doesn't matter that
  // what's under it is already "ready" before the animation reveals it.
  headerReady = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    if (!isPlatformBrowser(this.platformId) || wasServerPrerendered()) {
      this.headerReady = true;
    }
  }

  ngOnInit(): void {
    // Title/description/keywords/OG/Twitter tags are authored once in index.html -
    // do not touch them here. This used to call Title/Meta service setters, but
    // since app.routes.server.ts prerenders this component at build time, that
    // overwrote the real tags with weaker, duplicate ones in every static page.

    // Vercel Web Analytics + Speed Insights, additive to the existing
    // gtag.js-based AnalyticsService (see analytics.service.ts). Both
    // `inject()` calls are already no-ops when `window` is undefined, but the
    // isPlatformBrowser() guard is kept as defensive belt-and-braces since this
    // component is now also rendered server-side during prerendering.
    if (isPlatformBrowser(this.platformId)) {
      injectVercelAnalytics();
      injectSpeedInsights();
    }
  }

  onLoadingScreenFinished(): void {
    this.headerReady = true;
  }
}
