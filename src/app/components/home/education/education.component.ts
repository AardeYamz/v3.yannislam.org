import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.scss'],
  standalone: false
})
export class EducationComponent implements OnInit {

  active = 0
  data: any = jsonData;
  experiences: any = this.data.about.experiences;
  sectionTitle: any = this.data.siteMenu.find((item: { navNumber: string; }) => item?.navNumber === "01. ");


  constructor(
    public analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void {
    console.log(this.sectionTitle)
  }
}
