
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from './../../../../../assets/config.json';

@Component({
  selector: 'app-namecard',
  imports: [AosDirective],
  templateUrl: './namecard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './namecard.component.scss'
})
export class NamecardComponent {
  data: any = jsonData;

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService
  ) { }

  ngOnInit() { }

}
