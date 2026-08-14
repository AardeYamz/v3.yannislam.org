
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-namecard',
  imports: [AosDirective],
  templateUrl: './namecard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './namecard.component.scss'
})
export class NamecardComponent {
  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public configService: SiteConfigService
  ) { }

  get data() { return this.configService.data; }
}
