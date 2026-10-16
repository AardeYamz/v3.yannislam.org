import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { WorkHistoryEntry } from 'src/app/services/site-config/site-config.model';

@Component({
  selector: 'app-workhistory',
  templateUrl: './workhistory.component.html',
  styleUrls: ['./workhistory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WorkHistoryComponent {
  // Reused for both work/volunteering experience entries and college
  // project cards (see home.component.html / projects.component.html) --
  // genuinely either shape depending on which section renders it.
  @Input() experienceList: WorkHistoryEntry[] = [];
  @Input() sectionId = '';
  @Input() navNumber = '';
  @Input() headingText = '';
  @Input() subsection = false;

  customOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    navSpeed: 700,
    items: 1,
    autoplay: true,
    autoplayTimeout: 3000
  }

  constructor(
    public analyticsService: AnalyticsService
  ) { }
}
