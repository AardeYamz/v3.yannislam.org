import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { EducationComponent } from './education.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { LogoFallbackDirective } from 'src/app/directives/logo-fallback/logo-fallback.directive';

describe('EducationComponent', () => {
    let component: EducationComponent;
    let fixture: ComponentFixture<EducationComponent>;
    let analyticsService: MockedObject<AnalyticsService>;
    let configService: MockedObject<SiteConfigService>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const configServiceSpy = {
            experiences: {
                education: [
                    {
                        tab: 'University of Example',
                        title: 'BS Computer Science',
                        timeframe: '2020-2024',
                        description: ['Graduated with honors'],
                        skills: ['Java', 'Python'],
                        logoKey: 'university'
                    }
                ]
            }
        };

        TestBed.configureTestingModule({
            imports: [CommonModule, NgbNavModule, AosDirective, LogoFallbackDirective, EducationComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy }
            ]
        });

        analyticsService = TestBed.inject(AnalyticsService) as MockedObject<AnalyticsService>;
        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
        fixture = TestBed.createComponent(EducationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load education experiences from config service', () => {
        expect(component.experiences).toBeDefined();
        expect(component.experiences.education).toBeDefined();
    });

    it('should have active tab index', () => {
        expect(component.active).toBe(0);
    });

    it('should initialize with education list', () => {
        expect(component.experiences.education.length).toBeGreaterThan(0);
        expect(component.experiences.education[0].title).toBe('BS Computer Science');
    });

    it('should have analytics service', () => {
        expect(component.analyticsService).toBeDefined();
    });

    it('should have config service', () => {
        expect(component.configService).toBeDefined();
    });

});
