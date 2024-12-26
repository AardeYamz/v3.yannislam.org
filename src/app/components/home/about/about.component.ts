import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  standalone: false
})
export class AboutComponent implements OnInit {
  constructor(
    public analyticsService: AnalyticsService
  ) { }
  data: any = jsonData;
  skills: any = this.data.about.experiences.skills;

  ngOnInit(): void { }
}
