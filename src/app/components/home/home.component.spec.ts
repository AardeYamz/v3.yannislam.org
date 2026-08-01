import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { HomeComponent } from './home.component';
import { HomeModule } from './home.module';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { ResumeService } from 'src/app/services/resume/resume.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(() => {
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      experiences: {
        work: {
          sectionId: 'work',
          navNumber: '01',
          headingText: 'Experience',
          list: []
        },
        volunteering: {
          sectionId: 'volunteering',
          navNumber: '02',
          headingText: 'Volunteering',
          list: []
        }
      }
    });
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });
    const resumeServiceSpy = jasmine.createSpyObj('ResumeService', ['open']);

    TestBed.configureTestingModule({
      imports: [HomeModule, RouterTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: SiteConfigService, useValue: configServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: ResumeService, useValue: resumeServiceSpy }
      ]
    });

    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load experiences from config service', () => {
    expect(component.experiences).toBeDefined();
    expect(component.experiences.work).toBeDefined();
    expect(component.experiences.volunteering).toBeDefined();
  });

  it('should have work experiences', () => {
    expect(component.experiences.work.list).toBeDefined();
    expect(Array.isArray(component.experiences.work.list)).toBe(true);
  });

  it('should have volunteering experiences', () => {
    expect(component.experiences.volunteering.list).toBeDefined();
    expect(Array.isArray(component.experiences.volunteering.list)).toBe(true);
  });

  it('should render without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
