import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EducationComponent {

  active = 0
  experiences: any;

  constructor(
    public analyticsService: AnalyticsService,
    public configService: SiteConfigService
  ) {
    this.experiences = this.configService.experiences;
  }
}
