import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ScrollService } from 'src/app/services/scroll/scroll.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { LinkPreviewDirective } from '../../../directives/link-preview/link-preview.directive';
import { HeaderComponent } from '../header/header.component';
import { IconComponent } from 'src/app/icons/icon.component';
import { Contact, FooterConfig } from 'src/app/services/site-config/site-config.model';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    animations: [
        fadeStaggerAnimation('animateFooter', 'translateY(100%)')
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LinkPreviewDirective, HeaderComponent, DatePipe, IconComponent],
})
export class FooterComponent {
    analyticsService = inject(AnalyticsService);
    configService = inject(SiteConfigService);
    private scrollService = inject(ScrollService);

    socials: Contact[];
    mobileSocials: Contact[];
    email: Contact;
    footer: FooterConfig;
    currentDate = new Date();

    // Small threshold so momentum/overscroll right at the end of the page
    // still counts as "at the bottom" instead of requiring the scroll
    // position to land on the exact last pixel.
    private static readonly BOTTOM_THRESHOLD_PX = 4;

    // Whether the page is scrolled all the way to the bottom — on wide
    // viewports this collapses the fixed side bars (footer-left-bar /
    // footer-right-bar) into a single inline row within the footer itself,
    // mirroring the layout already used on mobile. Used to be computed from
    // this component's own `window:scroll`/`window:resize` listeners,
    // re-reading `document.documentElement.scrollHeight` (a forced layout)
    // on every single scroll event. Derived from the shared ScrollService
    // instead — one passive listener and one cached `maxScroll` (recomputed
    // only on resize) for the whole page, rather than every scroll-driven
    // component doing its own layout read per tick.
    readonly atBottom = computed(() =>
        this.scrollService.y() >= this.scrollService.maxScroll() - FooterComponent.BOTTOM_THRESHOLD_PX
    );

    constructor() {
        this.socials = this.configService.contacts;
        // Email is always in config.json's contact list (see CLAUDE.md's
        // "Add a New Social Link" section) -- non-null assertion rather
        // than an optional type that every consumer would then need to
        // guard against for a contact that's never actually missing.
        this.email = this.socials.find((item) => item.name === "Email")!;
        this.mobileSocials = this.socials.filter((item) => item.name !== "Email");
        this.footer = this.configService.footer;
    }
}
