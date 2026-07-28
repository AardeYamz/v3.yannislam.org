import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';

@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ContactComponent implements OnInit {

  constructor(
    public analyticsService: AnalyticsService

  ) { }

  ngOnInit(): void {
  }

}
