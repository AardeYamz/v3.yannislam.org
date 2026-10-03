import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AosDirective } from '../../../directives/aos/aos.directive';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-education',
    templateUrl: './education.component.html',
    styleUrls: ['./education.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet]
})
export class EducationComponent {
  analyticsService = inject(AnalyticsService);
  configService = inject(SiteConfigService);


  active = 0
  experiences: any;

  constructor() {
    this.experiences = this.configService.experiences;
  }
}
