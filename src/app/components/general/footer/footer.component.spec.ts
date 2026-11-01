import type { Mock, MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FooterComponent } from './footer.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { LinkPreviewDirective } from 'src/app/directives/link-preview/link-preview.directive';
import { IconComponent } from 'src/app/icons/icon.component';

describe('FooterComponent', () => {
    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;
    let analyticsService: MockedObject<AnalyticsService>;
    let configService: MockedObject<SiteConfigService>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const configServiceSpy = {
            contacts: [{ name: 'Email', url: 'mailto:test@example.com', handle: 'test@example.com', icon: 'fa-envelope' }],
            footer: {
                repo: { url: 'https://github.com', text: 'View Source' },
                builtWith: { text: 'Built with', url: 'https://angular.io', linkText: 'Angular' },
                designCredits: [{ name: 'Designer', url: 'https://example.com', separator: '' }]
            }
        };

        TestBed.configureTestingModule({
            imports: [LinkPreviewDirective, FooterComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy }
            ]
        });

        analyticsService = TestBed.inject(AnalyticsService) as MockedObject<AnalyticsService>;
        configService = TestBed.inject(SiteConfigService) as MockedObject<SiteConfigService>;
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
        let scrollYSpy: Mock;
        let innerHeightSpy: Mock;
        let scrollHeightSpy: Mock;

        beforeEach(() => {
            scrollYSpy = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
            innerHeightSpy = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(0);
            scrollHeightSpy = vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(0);
        });

        function mockScrollPosition(scrollY: number, innerHeight: number, scrollHeight: number): void {
            scrollYSpy.mockReturnValue(scrollY);
            innerHeightSpy.mockReturnValue(innerHeight);
            scrollHeightSpy.mockReturnValue(scrollHeight);
        }

        it('is false while there is more of the page left to scroll', () => {
            mockScrollPosition(0, 800, 3000);

            component.checkScrollPosition();

            expect(component.atBottom()).toBe(false);
        });

        it('becomes true once the viewport reaches the bottom of the page', () => {
            mockScrollPosition(2200, 800, 3000);

            component.checkScrollPosition();

            expect(component.atBottom()).toBe(true);
        });

        it('counts landing within the bottom threshold as being at the bottom', () => {
            mockScrollPosition(2197, 800, 3000);

            component.checkScrollPosition();

            expect(component.atBottom()).toBe(true);
        });

        it('flips back to false after scrolling back up from the bottom', () => {
            mockScrollPosition(2200, 800, 3000);
            component.checkScrollPosition();
            expect(component.atBottom()).toBe(true);

            mockScrollPosition(1000, 800, 3000);
            component.checkScrollPosition();

            expect(component.atBottom()).toBe(false);
        });
    });
});
