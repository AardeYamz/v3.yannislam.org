import { Component, ElementRef, ViewChild } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-workhistory',
  templateUrl: './workhistory.component.html',
  styleUrls: ['./workhistory.component.scss'],
  standalone: false
})
export class WorkHistoryComponent {
  data: any = jsonData;

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

  @ViewChild('imgContainer') imgContainer: ElementRef | undefined;


  constructor(
    public analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void { }

  debug() {

    this.imgContainer?.nativeElement.scroll({
      top: this.imgContainer?.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
  }
}
