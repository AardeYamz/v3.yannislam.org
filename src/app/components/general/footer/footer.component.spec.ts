import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FooterComponent } from './footer.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { LinkPreviewDirective } from 'src/app/directives/link-preview/link-preview.directive';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let configService: jasmine.SpyObj<SiteConfigService>;

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

    TestBed.configureTestingModule({
      declarations: [FooterComponent],
      imports: [LinkPreviewDirective],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: SiteConfigService, useValue: configServiceSpy }
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

  describe('checkScrollPosition() / atBottom', () => {
    // atBottom reads live window/document geometry, so pin those rather
    // than relying on whatever size the Karma test page happens to be.
    // Spies are created once per test and their return values updated on
    // reuse, since Jasmine disallows spying on the same property twice.
    let scrollYSpy: jasmine.Spy;
    let innerHeightSpy: jasmine.Spy;
    let scrollHeightSpy: jasmine.Spy;

    beforeEach(() => {
      scrollYSpy = spyOnProperty(window, 'scrollY', 'get').and.returnValue(0);
      innerHeightSpy = spyOnProperty(window, 'innerHeight', 'get').and.returnValue(0);
      scrollHeightSpy = spyOnProperty(document.documentElement, 'scrollHeight', 'get').and.returnValue(0);
    });

    function mockScrollPosition(scrollY: number, innerHeight: number, scrollHeight: number): void {
      scrollYSpy.and.returnValue(scrollY);
      innerHeightSpy.and.returnValue(innerHeight);
      scrollHeightSpy.and.returnValue(scrollHeight);
    }

    it('is false while there is more of the page left to scroll', () => {
      mockScrollPosition(0, 800, 3000);

      component.checkScrollPosition();

      expect(component.atBottom()).toBeFalse();
    });

    it('becomes true once the viewport reaches the bottom of the page', () => {
      mockScrollPosition(2200, 800, 3000);

      component.checkScrollPosition();

      expect(component.atBottom()).toBeTrue();
    });

    it('counts landing within the bottom threshold as being at the bottom', () => {
      mockScrollPosition(2197, 800, 3000);

      component.checkScrollPosition();

      expect(component.atBottom()).toBeTrue();
    });

    it('flips back to false after scrolling back up from the bottom', () => {
      mockScrollPosition(2200, 800, 3000);
      component.checkScrollPosition();
      expect(component.atBottom()).toBeTrue();

      mockScrollPosition(1000, 800, 3000);
      component.checkScrollPosition();

      expect(component.atBottom()).toBeFalse();
    });
  });
});
