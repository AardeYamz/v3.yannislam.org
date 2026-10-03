import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { FooterComponent } from './footer.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ScrollService } from 'src/app/services/scroll/scroll.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { LinkPreviewDirective } from 'src/app/directives/link-preview/link-preview.directive';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let configService: jasmine.SpyObj<SiteConfigService>;
  let scrollY: ReturnType<typeof signal<number>>;
  let scrollMaxScroll: ReturnType<typeof signal<number>>;

  beforeEach(() => {
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      contacts: [{ name: 'Email', url: 'mailto:test@example.com', handle: 'test@example.com', icon: 'fa-envelope' }],
      footer: {
        repo: { url: 'https://github.com', text: 'View Source' },
        builtWith: { text: 'Built with', url: 'https://angular.io', linkText: 'Angular' },
        designCredits: [{ name: 'Designer', url: 'https://example.com', separator: '' }]
      }
    });
    scrollY = signal(0);
    scrollMaxScroll = signal(0);
    const scrollServiceStub = { y: scrollY, maxScroll: scrollMaxScroll };

    TestBed.configureTestingModule({
      declarations: [FooterComponent],
      imports: [LinkPreviewDirective],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: SiteConfigService, useValue: configServiceSpy },
        { provide: ScrollService, useValue: scrollServiceStub }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load footer configuration', () => {
    expect(component.footer).toBeDefined();
    expect(component.footer.repo).toBeDefined();
  });

  it('should load social contacts', () => {
    expect(component.socials).toBeDefined();
    expect(component.socials.length).toBeGreaterThan(0);
  });

  it('should find email contact', () => {
    expect(component.email).toBeDefined();
    expect(component.email.name).toBe('Email');
  });

  it('should display current year', () => {
    expect(component.currentDate).toBeDefined();
    expect(component.currentDate.getFullYear()).toBe(new Date().getFullYear());
  });

  describe('atBottom', () => {
    it('is false while there is more of the page left to scroll', () => {
      scrollY.set(0);
      scrollMaxScroll.set(2200);

      expect(component.atBottom()).toBeFalse();
    });

    it('becomes true once the scroll position reaches the bottom', () => {
      scrollY.set(2200);
      scrollMaxScroll.set(2200);

      expect(component.atBottom()).toBeTrue();
    });

    it('counts landing within the bottom threshold as being at the bottom', () => {
      scrollY.set(2197);
      scrollMaxScroll.set(2200);

      expect(component.atBottom()).toBeTrue();
    });

    it('flips back to false after scrolling back up from the bottom', () => {
      scrollY.set(2200);
      scrollMaxScroll.set(2200);
      expect(component.atBottom()).toBeTrue();

      scrollY.set(1000);

      expect(component.atBottom()).toBeFalse();
    });
  });
});
