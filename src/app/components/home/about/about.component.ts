import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AboutComponent implements OnInit {
  constructor(
    public analyticsService: AnalyticsService
  ) { }
  data: any = jsonData;

  ngOnInit(): void { }
}
