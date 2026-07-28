import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AboutComponent {
  constructor(
    public analyticsService: AnalyticsService,
    public configService: SiteConfigService
  ) { }

  get data() { return this.configService.data; }
}
