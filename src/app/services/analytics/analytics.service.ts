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
    gtag('event', action, { event_category: category, event_label: label });
  }

  sendAnalyticPageView(path: string, title: string) {
    if (typeof gtag !== 'function') return;
    gtag('event', 'page_view', { page_path: path, page_title: title });
  }
}
