import { Component, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BannerComponent {
    // ngx-typed-js (and the typed.js library it wraps) calls getComputedStyle()
    // and otherwise assumes a real browser, which throws under Domino during
    // server-side prerendering - so it's only rendered client-side (see
    // banner.component.html), with a static first line shown on the server.
    readonly isBrowser: boolean;

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
        private resumeService: ResumeService,
        @Inject(PLATFORM_ID) platformId: object,
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    get data() { return this.configService.data; }

    openResume() {
        this.analyticsService.sendAnalyticEvent('click_open_resume', 'banner', 'resume');
        this.resumeService.open();
    }
}
