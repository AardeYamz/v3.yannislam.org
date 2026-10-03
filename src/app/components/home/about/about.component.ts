import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AosDirective } from '../../../directives/aos/aos.directive';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective]
})
export class AboutComponent {
  analyticsService = inject(AnalyticsService);
  configService = inject(SiteConfigService);


  get data() { return this.configService.data; }
}
