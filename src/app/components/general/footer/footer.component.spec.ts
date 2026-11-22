import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { FooterComponent } from './footer.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ScrollService } from 'src/app/services/scroll/scroll.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { LinkPreviewDirective } from 'src/app/directives/link-preview/link-preview.directive';
import config from '../../../../assets/config.json';
import { IconComponent } from 'src/app/icons/icon.component';

describe('FooterComponent', () => {
    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;
    let analyticsService: MockedObject<AnalyticsService>;
    let configService: MockedObject<SiteConfigService>;
    let scrollY: ReturnType<typeof signal<number>>;
    let scrollMaxScroll: ReturnType<typeof signal<number>>;

    beforeEach(() => {
        const analyticsServiceSpy = {
            sendAnalyticEvent: vi.fn().mockName("AnalyticsService.sendAnalyticEvent")
        };
        const configServiceSpy = {
            ui: config.ui,
            contacts: [{ name: 'Email', url: 'mailto:test@example.com', handle: 'test@example.com', icon: 'fa-envelope' }],
            footer: {
                repo: { url: 'https://github.com', text: 'View Source' },
                builtWith: { text: 'Built with', url: 'https://angular.io', linkText: 'Angular' },
                designCredits: [{ name: 'Designer', url: 'https://example.com', separator: '' }]
            }
        };
        scrollY = signal(0);
        scrollMaxScroll = signal(0);
        const scrollServiceStub = { y: scrollY, maxScroll: scrollMaxScroll };

        TestBed.configureTestingModule({
            imports: [LinkPreviewDirective, FooterComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AnalyticsService, useValue: analyticsServiceSpy },
                { provide: SiteConfigService, useValue: configServiceSpy },
                { provide: ScrollService, useValue: scrollServiceStub }
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

    describe('atBottom', () => {
        it('is false while there is more of the page left to scroll', () => {
            scrollY.set(0);
            scrollMaxScroll.set(2200);

            expect(component.atBottom()).toBe(false);
        });

        it('becomes true once the scroll position reaches the bottom', () => {
            scrollY.set(2200);
            scrollMaxScroll.set(2200);

            expect(component.atBottom()).toBe(true);
        });

        it('counts landing within the bottom threshold as being at the bottom', () => {
            scrollY.set(2197);
            scrollMaxScroll.set(2200);

            expect(component.atBottom()).toBe(true);
        });

        it('flips back to false after scrolling back up from the bottom', () => {
            scrollY.set(2200);
            scrollMaxScroll.set(2200);
            expect(component.atBottom()).toBe(true);

            scrollY.set(1000);

            expect(component.atBottom()).toBe(false);
        });
    });
});
