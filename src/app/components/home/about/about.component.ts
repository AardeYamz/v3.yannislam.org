import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AboutComponent {
  constructor(
    public analyticsService: AnalyticsService,
    public configService: SiteConfigService
  ) { }

  get data() { return this.configService.data; }

  // This section's position among the page's top-level sections (0-based,
  // matching the "01. About" numbering in the nav) — even sections put
  // their secondary/visual element (the photo) first, odd put it last,
  // same convention workhistory already uses per-entry via i % 2. Keeps
  // consecutive sections from defaulting to the same left/right layout.
  private static readonly SECTION_INDEX = 0;

  get isReversed(): boolean {
    return AboutComponent.SECTION_INDEX % 2 !== 0;
  }
}
