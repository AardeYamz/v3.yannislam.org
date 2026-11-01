import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    let analyticsService: MockedObject<AnalyticsService>;
    let resumeService: MockedObject<ResumeService>;
    let configService: MockedObject<SiteConfigService>;
    let themeService: MockedObject<ThemeService>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const resumeServiceSpy = {
            open: vi.fn().mockName("ResumeService.open")
        };
        const configServiceSpy = {
            data: {
                banner: {
                    greeting: 'Hello',
                    name: 'John Doe',
                    typeSection: ['Developer', 'Designer'],
                    blurb: ['I build things']
                }
            }
        };
        const themeServiceSpy = {
            mode: vi.fn().mockName('mode').mockReturnValue('default')
        };

        TestBed.configureTestingModule({
            imports: [BannerComponent, FloatingLogosComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: ResumeService, useValue: resumeServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy },
                { provide: ThemeService, useValue: themeServiceSpy }
            ]
        });

        analyticsService = TestBed.inject(AnalyticsService) as MockedObject<AnalyticsService>;
        resumeService = TestBed.inject(ResumeService) as MockedObject<ResumeService>;
        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
        themeService = TestBed.inject(ThemeService) as MockedObject<ThemeService>;
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
