import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { FadeStaggerDirective } from 'src/app/directives/fade-stagger/fade-stagger.directive';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { FloatingLogosComponent } from '../floating-logos/floating-logos.component';
import { LogoLoopComponent } from '../logo-loop/logo-loop.component';
import { TypewriterComponent } from './typewriter/typewriter.component';
import { LinkPreviewDelegateDirective } from '../../../directives/link-preview/link-preview-delegate.directive';

@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FadeStaggerDirective, FloatingLogosComponent, LogoLoopComponent, TypewriterComponent, LinkPreviewDelegateDirective]
})
export class BannerComponent {
    analyticsService = inject(AnalyticsService);
    configService = inject(SiteConfigService);
    private resumeService = inject(ResumeService);

    get data() { return this.configService.data; }

    openResume() {
        this.analyticsService.sendAnalyticEvent('click_open_resume', 'banner', 'resume');
        this.resumeService.open();
    }
}
