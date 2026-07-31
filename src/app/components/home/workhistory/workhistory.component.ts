import { Component, ElementRef, ViewChild, ChangeDetectionStrategy, Input } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';

@Component({
  selector: 'app-workhistory',
  templateUrl: './workhistory.component.html',
  styleUrls: ['./workhistory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WorkHistoryComponent {
  @Input() experienceList: any[] = [];
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

  @ViewChild('imgContainer') imgContainer: ElementRef | undefined;


  constructor(
    public analyticsService: AnalyticsService
  ) { }

  debug() {

    this.imgContainer?.nativeElement.scroll({
      top: this.imgContainer?.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
  }
}
