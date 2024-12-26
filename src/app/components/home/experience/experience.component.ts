import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-experience',
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.scss'],
  standalone: false
})
export class ExperienceComponent implements OnInit {

  active = 0
  data: any = jsonData;
  experiences: any = this.data.about.experiences;

  constructor(
    public analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void {

  }
}
