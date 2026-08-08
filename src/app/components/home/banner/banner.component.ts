import { Component, ChangeDetectionStrategy, signal, OnDestroy } from '@angular/core';

import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

// Minimum/maximum time the guided auto-scroll is allowed to take, regardless of page length.
const AUTO_SCROLL_MIN_DURATION_MS = 6000;
const AUTO_SCROLL_MAX_DURATION_MS = 30000;
const AUTO_SCROLL_PIXELS_PER_SECOND = 140;

@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss'],
    animations: [
        fadeStaggerAnimation('bannerTrigger', 'translateX(-50px)')
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class BannerComponent implements OnDestroy {
    showScrollArrow = signal(false);

    private autoScrollFrame: number | null = null;
    private cancelAutoScroll: (() => void) | null = null;

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
        private resumeService: ResumeService
    ) {
        setTimeout(() => this.showScrollArrow.set(true), 5000);
    }

    get data() { return this.configService.data; }

    openResume() {
        this.analyticsService.sendAnalyticEvent('click_open_resume', 'banner', 'resume');
        this.resumeService.open();
    }

    ngOnDestroy() {
        this.stopAutoScroll();
    }

    // Scrolls continuously from the current position all the way through the
    // rest of the page (about -> education -> experience -> volunteering) at a
    // constant slow pace, instead of jumping section-to-section. Cancels itself
    // the moment the user scrolls, drags, or presses a key, so it never fights
    // with manual scrolling.
    scrollToAbout() {
        const volunteeringSection = document.getElementById('volunteering');
        const startPosition = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetPosition = volunteeringSection
            ? Math.min(volunteeringSection.offsetTop + volunteeringSection.offsetHeight - window.innerHeight, maxScroll)
            : maxScroll;

        this.startAutoScroll(startPosition, targetPosition);
    }

    private startAutoScroll(startPosition: number, targetPosition: number) {
        this.stopAutoScroll();

        const distance = targetPosition - startPosition;
        if (Math.abs(distance) < 10) return;

        const duration = Math.min(
            Math.max((Math.abs(distance) / AUTO_SCROLL_PIXELS_PER_SECOND) * 1000, AUTO_SCROLL_MIN_DURATION_MS),
            AUTO_SCROLL_MAX_DURATION_MS
        );

        let start: number | null = null;

        const stop = () => {
            if (this.autoScrollFrame !== null) {
                cancelAnimationFrame(this.autoScrollFrame);
                this.autoScrollFrame = null;
            }
            window.removeEventListener('wheel', stop);
            window.removeEventListener('touchstart', stop);
            window.removeEventListener('pointerdown', stop);
            window.removeEventListener('keydown', stop);
            this.cancelAutoScroll = null;
        };
        this.cancelAutoScroll = stop;

        window.addEventListener('wheel', stop, { passive: true });
        window.addEventListener('touchstart', stop, { passive: true });
        window.addEventListener('pointerdown', stop, { passive: true });
        window.addEventListener('keydown', stop);

        const animate = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            window.scrollTo(0, startPosition + distance * this.easeInOutSine(progress));

            if (progress < 1) {
                this.autoScrollFrame = requestAnimationFrame(animate);
            } else {
                stop();
            }
        };

        this.autoScrollFrame = requestAnimationFrame(animate);
    }

    private stopAutoScroll() {
        this.cancelAutoScroll?.();
    }

    private easeInOutSine(t: number): number {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
}
