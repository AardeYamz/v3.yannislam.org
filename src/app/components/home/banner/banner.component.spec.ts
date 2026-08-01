import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { BannerComponent } from './banner.component';
import { FloatingLogosComponent } from '../floating-logos/floating-logos.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let resumeService: jasmine.SpyObj<ResumeService>;
  let configService: jasmine.SpyObj<SiteConfigService>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);
    const resumeServiceSpy = jasmine.createSpyObj('ResumeService', ['open']);
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      data: {
        banner: {
          greeting: 'Hello',
          name: 'John Doe',
          typeSection: ['Developer', 'Designer'],
          blurb: ['I build things']
        }
      }
    });
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });

    TestBed.configureTestingModule({
      declarations: [BannerComponent, FloatingLogosComponent],
      imports: [NgxTypedJsModule],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: ResumeService, useValue: resumeServiceSpy },
        { provide: SiteConfigService, useValue: configServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    resumeService = TestBed.inject(ResumeService) as jasmine.SpyObj<ResumeService>;
    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load banner data from config service', () => {
    expect(component.data).toBeDefined();
    expect(component.data.banner.greeting).toBe('Hello');
  });

  it('openResume() logs an analytics event and opens the resume', () => {
    component.openResume();

    expect(analyticsService.sendAnalyticEvent)
      .toHaveBeenCalledWith('click_open_resume', 'banner', 'resume');
    expect(resumeService.open).toHaveBeenCalled();
  });

  it('should have analytics service', () => {
    expect(component.analyticsService).toBeDefined();
  });

  it('should have config service', () => {
    expect(component.configService).toBeDefined();
  });
});
