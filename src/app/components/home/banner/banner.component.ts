import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

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
export class BannerComponent {
    showScrollArrow = signal(false);

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

    scrollToAbout() {
        const aboutSection = document.getElementById('about');
        if (aboutSection) {
            aboutSection.scrollIntoView({ behavior: 'smooth' });
            this.autoScrollPages();
        }
    }

    private autoScrollPages() {
        const sections = ['education', 'experience', 'volunteering', 'projects'];
        let currentIndex = 0;
        const scrollDuration = 5000; // 5 seconds per section

        const scrollToNextSection = () => {
            if (currentIndex < sections.length) {
                const section = document.getElementById(sections[currentIndex]);
                if (section) {
                    this.smoothScrollTo(section, scrollDuration);
                    currentIndex++;
                    setTimeout(scrollToNextSection, scrollDuration + 1000); // 1 second pause between sections
                }
            }
        };

        scrollToNextSection();
    }

    private smoothScrollTo(element: HTMLElement, duration: number) {
        const startPosition = window.scrollY;
        const endPosition = element.offsetTop - 100; // 100px offset from top
        const distance = endPosition - startPosition;
        let start: number | null = null;

        const animation = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = (timestamp - start) / duration;

            if (progress < 1) {
                window.scrollTo(0, startPosition + distance * this.easeInOutQuad(progress));
                requestAnimationFrame(animation);
            } else {
                window.scrollTo(0, endPosition);
            }
        };

        requestAnimationFrame(animation);
    }

    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}
