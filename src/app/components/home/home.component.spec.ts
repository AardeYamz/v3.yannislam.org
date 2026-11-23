import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { HomeComponent } from './home.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { ResumeService } from 'src/app/services/resume/resume.service';

describe('HomeComponent', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;
    let configService: MockedObject<SiteConfigService>;

    beforeEach(() => {
        const configServiceSpy = {
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
        };
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const themeServiceSpy = {
            mode: vi.fn().mockName('mode').mockReturnValue('default')
        };
        const resumeServiceSpy = {
            open: vi.fn().mockName("ResumeService.open")
        };

        TestBed.configureTestingModule({
            imports: [HomeComponent, RouterTestingModule],
            providers: [
                provideNoopAnimations(),
                { provide: SiteConfigService, useValue: configServiceSpy },
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: ThemeService, useValue: themeServiceSpy },
                { provide: ResumeService, useValue: resumeServiceSpy }
            ]
        });

        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
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

});
