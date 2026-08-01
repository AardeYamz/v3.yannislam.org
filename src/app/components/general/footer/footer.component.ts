import { Component, ChangeDetectionStrategy } from '@angular/core';
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
export class FooterComponent {
    socials: any;
    email: any;
    footer: any;
    currentDate = new Date();
    deploymentStatus = {
        lastUpdate: '2026-08-01',
        testsPassing: '80/96 (83.3%)',
        buildStatus: '✅ Success'
    };

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
    ) {
        this.socials = this.configService.contacts;
        this.email = this.socials.find((item: { name: string; }) => item?.name === "Email");
        this.footer = this.configService.footer;
    }
}