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

        const scrollToNextSection = () => {
            if (currentIndex < sections.length) {
                const section = document.getElementById(sections[currentIndex]);
                if (section) {
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth' });
                        currentIndex++;
                        scrollToNextSection();
                    }, 3000);
                }
            }
        };

        scrollToNextSection();
    }
}
