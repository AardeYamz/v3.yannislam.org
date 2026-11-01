import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { AboutComponent } from './about.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AosDirective } from 'src/app/directives/aos/aos.directive';

describe('AboutComponent', () => {
    let component: AboutComponent;
    let fixture: ComponentFixture<AboutComponent>;
    let analyticsService: MockedObject<AnalyticsService>;
    let configService: MockedObject<SiteConfigService>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const configServiceSpy = {
            data: {
                about: {
                    first: 'John',
                    last: 'Doe',
                    email: 'john@example.com',
                    contact: [],
                    aardeyamz: []
                },
                experiences: {}
            }
        };

        TestBed.configureTestingModule({
            imports: [CommonModule, AosDirective, AboutComponent],
            providers: [
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy }
            ]
        });

        analyticsService = TestBed.inject(AnalyticsService) as MockedObject<AnalyticsService>;
        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
        fixture = TestBed.createComponent(AboutComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should get data from config service', () => {
        expect(component.data).toBeDefined();
    });

    it('should have analytics service', () => {
        expect(component.analyticsService).toBeDefined();
    });

    it('should have config service', () => {
        expect(component.configService).toBeDefined();
    });

});
