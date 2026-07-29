import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let gtagSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
    gtagSpy = jasmine.createSpy('gtag');
    (window as any).gtag = gtagSpy;
  });

  afterEach(() => {
    delete (window as any).gtag;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sendAnalyticEvent forwards to the global gtag() as a GA4 event', () => {
    service.sendAnalyticEvent('click_send_mail', 'contact', 'email');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'click_send_mail', {
      event_category: 'contact',
      event_label: 'email',
    });
  });

  it('sendAnalyticPageView forwards to the global gtag() as a page_view event', () => {
    service.sendAnalyticPageView('/projects', 'Projects');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/projects',
      page_title: 'Projects',
    });
  });

  it('does not throw when gtag is unavailable (e.g. blocked by an ad blocker)', () => {
    delete (window as any).gtag;

    expect(() => service.sendAnalyticEvent('a', 'b', 'c')).not.toThrow();
    expect(() => service.sendAnalyticPageView('/', 'Home')).not.toThrow();
  });
});
