import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FooterComponent } from './footer.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

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
});
