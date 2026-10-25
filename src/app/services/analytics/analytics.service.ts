import { Injectable } from '@angular/core';

// gtag() is defined by the inline script in src/index.html (loaded before
// Angular bootstraps), which queues calls into window.dataLayer regardless
// of whether the remote gtag.js script has finished loading yet — so it's
// safe to call unconditionally once the app is running.
declare function gtag(...args: unknown[]): void;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  sendAnalyticEvent(action: string, category: string, label: string) {
    if (typeof gtag !== 'function') return;
    // GA4 has no built-in event_category/event_label (those were Universal
    // Analytics); plain `category`/`label` params are the GA4 convention and
    // can be registered as custom dimensions.
    gtag('event', action, { category, label });
  }
}
