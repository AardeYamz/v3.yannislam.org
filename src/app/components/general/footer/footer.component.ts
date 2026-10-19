import { Component, ChangeDetectionStrategy, HostListener, AfterViewInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    animations: [
        fadeStaggerAnimation('animateFooter', 'translateY(100%)')
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class FooterComponent implements AfterViewInit {
    socials: any;
    mobileSocials: any;
    email: any;
    footer: any;
    currentDate = new Date();

    // Whether the page is scrolled all the way to the bottom — on wide
    // viewports this collapses the fixed side bars (footer-left-bar /
    // footer-right-bar) into a single inline row within the footer itself,
    // mirroring the layout already used on mobile. A signal (rather than a
    // plain property) since it's written from a window scroll/resize
    // listener outside any template binding; under zoneless change
    // detection only a signal write is guaranteed to refresh an OnPush view.
    atBottom = signal<boolean>(false);

    // Domino (Angular's server-side DOM emulation) provides a `window`
    // stand-in during prerendering, but scroll APIs like `scrollY` aren't
    // meaningfully implemented there, so this is gated to the browser only.
    private readonly isBrowser: boolean;

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
        @Inject(PLATFORM_ID) platformId: object,
    ) {
        this.socials = this.configService.contacts;
        this.email = this.socials.find((item: { name: string; }) => item?.name === "Email");
        this.mobileSocials = this.socials.filter((item: { name: string; }) => item?.name !== "Email");
        this.footer = this.configService.footer;
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngAfterViewInit() {
        if (!this.isBrowser) return;
        this.checkScrollPosition();
    }

    @HostListener('window:scroll')
    @HostListener('window:resize')
    checkScrollPosition() {
        if (!this.isBrowser) return;

        // Small threshold so momentum/overscroll right at the end of the
        // page still counts as "at the bottom" instead of requiring the
        // scroll position to land on the exact last pixel.
        const bottomThresholdPx = 4;
        const scrolledToBottom = window.innerHeight + window.scrollY
            >= document.documentElement.scrollHeight - bottomThresholdPx;
        this.atBottom.set(scrolledToBottom);
    }
}