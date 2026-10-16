import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { OwlOptions, CarouselModule } from 'ngx-owl-carousel-o';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { AosDirective } from '../../../directives/aos/aos.directive';
import { LogoFallbackDirective } from '../../../directives/logo-fallback/logo-fallback.directive';
import { NgClass } from '@angular/common';
import { LogoFallbackBackgroundDirective } from '../../../directives/logo-fallback/logo-fallback-background.directive';
import { LinkifyPipe } from '../../../pipes/linkify/linkify.pipe';

@Component({
    selector: 'app-workhistory',
    templateUrl: './workhistory.component.html',
    styleUrls: ['./workhistory.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective, CarouselModule, LogoFallbackDirective, NgClass, LogoFallbackBackgroundDirective, LinkifyPipe]
})
export class WorkHistoryComponent {
  analyticsService = inject(AnalyticsService);

  experienceList = input<any[]>([]);
  sectionId = input('');
  navNumber = input('');
  headingText = input('');
  subsection = input(false);

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
}
