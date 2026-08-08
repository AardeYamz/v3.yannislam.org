import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  // This section's position among the page's top-level sections (0-based,
  // matching the "02. Education" numbering in the nav) — same convention
  // as AboutComponent's SECTION_INDEX, and the one workhistory already
  // uses per-entry via i % 2. Keeps consecutive sections from defaulting
  // to the same left/right layout (Education's tab list was always on
  // the left, directly above Experience's own left-aligned first card).
  private static readonly SECTION_INDEX = 1;

  get isReversed(): boolean {
    return EducationComponent.SECTION_INDEX % 2 !== 0;
  }
}
