import { Component, ChangeDetectionStrategy } from '@angular/core';

import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
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
    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService
    ) { }

    get data() { return this.configService.data; }
}
