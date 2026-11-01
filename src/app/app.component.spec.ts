import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { LoadingScreenComponent } from './components/general/loading-screen/loading-screen.component';
import { HeaderComponent } from './components/general/header/header.component';
import { FooterComponent } from './components/general/footer/footer.component';
import { IconComponent } from './icons/icon.component';
import { AnalyticsService } from './services/analytics/analytics.service';
import { SiteConfigService } from './services/site-config/site-config.service';
import { ThemeService } from './services/theme/theme.service';

describe('AppComponent', () => {
    let analyticsService: MockedObject<AnalyticsService>;
    let configService: MockedObject<SiteConfigService>;
    let themeService: MockedObject<ThemeService>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const configServiceSpy = {
            data: { banner: { greeting: 'Hello', name: 'Test', typeSection: [], blurb: [] } },
            contacts: [],
            footer: { repo: { url: '', text: '' }, builtWith: { text: '', url: '', linkText: '' }, designCredits: [] }
        };
        const themeServiceSpy = {
            mode: vi.fn().mockName('mode').mockReturnValue('default')
        };

        TestBed.configureTestingModule({
            imports: [RouterTestingModule, LoadingScreenComponent, HeaderComponent, FooterComponent, AppComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy },
                { provide: ThemeService, useValue: themeServiceSpy }
            ]
        });

        analyticsService = TestBed.inject(AnalyticsService) as MockedObject<AnalyticsService>;
        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
        themeService = TestBed.inject(ThemeService) as MockedObject<ThemeService>;
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

});
