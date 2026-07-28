import { Component, ElementRef, ViewChild, ChangeDetectionStrategy, Input, OnInit } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

interface WorkHistorySectionConfig {
  sectionId: string;
  navNumber: string;
  headingText: string;
  experienceList: any[];
}

@Component({
  selector: 'app-workhistory',
  templateUrl: './workhistory.component.html',
  styleUrls: ['./workhistory.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class WorkHistoryComponent implements OnInit {
  data: any = jsonData;

  // Which config.json experiences list (and heading) this instance renders.
  @Input() section: 'work' | 'volunteering' = 'work';

  sectionConfigs: Record<string, WorkHistorySectionConfig> = {
    work: {
      sectionId: 'workhistory',
      navNumber: '03.',
      headingText: "What's my experience?",
      experienceList: this.data?.about?.experiences?.work
    },
    volunteering: {
      sectionId: 'volunteering',
      navNumber: '04.',
      headingText: 'How do I give back?',
      experienceList: this.data?.about?.experiences?.volunteering
    }
  };

  sectionId = '';
  navNumber = '';
  headingText = '';
  experienceList: any[] = [];

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

  ngOnInit(): void {
    const config = this.sectionConfigs[this.section];
    this.sectionId = config.sectionId;
    this.navNumber = config.navNumber;
    this.headingText = config.headingText;
    this.experienceList = config.experienceList;
  }

  debug() {

    this.imgContainer?.nativeElement.scroll({
      top: this.imgContainer?.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
  }
}
