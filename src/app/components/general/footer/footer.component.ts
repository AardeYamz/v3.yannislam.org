import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ScrollService } from 'src/app/services/scroll/scroll.service';
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
export class FooterComponent {
    socials: any;
    mobileSocials: any;
    email: any;
    footer: any;
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

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
        private scrollService: ScrollService,
    ) {
        this.socials = this.configService.contacts;
        this.email = this.socials.find((item: { name: string; }) => item?.name === "Email");
        this.mobileSocials = this.socials.filter((item: { name: string; }) => item?.name !== "Email");
        this.footer = this.configService.footer;
    }

    // footer-left-bar renders the full `socials` list (Email included)
    // as one uniform row of icons. Font Awesome's mail glyph lives in the
    // "solid" style, not "brands" like the rest of that list, so it needs
    // its own prefix instead of the flat 'fab ' the others use.
    socialIconClass(social: { name: string; icon: string }): string {
        return (social?.name === 'Email' ? 'fas ' : 'fab ') + social?.icon;
    }
}
