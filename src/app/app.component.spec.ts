import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { LoadingScreenComponent } from './components/general/loading-screen/loading-screen.component';
import { HeaderComponent } from './components/general/header/header.component';
import { FooterComponent } from './components/general/footer/footer.component';
import { AnalyticsService } from './services/analytics/analytics.service';
import { SiteConfigService } from './services/site-config/site-config.service';
import { ThemeService } from './services/theme/theme.service';

describe('AppComponent', () => {
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let configService: jasmine.SpyObj<SiteConfigService>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      data: { banner: { greeting: 'Hello', name: 'Test', typeSection: [], blurb: [] } },
      contacts: [],
      footer: { repo: { url: '', text: '' }, builtWith: { text: '', url: '', linkText: '' }, designCredits: [] }
    });
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent, LoadingScreenComponent, HeaderComponent, FooterComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: SiteConfigService, useValue: configServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have headerReady as false initially', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.headerReady).toBe(false);
  });

  it('should set headerReady to true when loading screen finishes', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.onLoadingScreenFinished();
    expect(app.headerReady).toBe(true);
  });

  it('should initialize on component creation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
