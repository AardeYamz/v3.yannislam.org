import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { OwlOptions, CarouselModule } from 'ngx-owl-carousel-o';
import { IconComponent } from 'src/app/icons/icon.component';
import { WorkHistoryEntry } from 'src/app/services/site-config/site-config.model';
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
    imports: [AosDirective, CarouselModule, LogoFallbackDirective, NgClass, LogoFallbackBackgroundDirective, LinkifyPipe, IconComponent]
})
export class WorkHistoryComponent {
  // Reused for both work/volunteering experience entries and college
  // project cards (see home.component.html / projects.component.html) --
  // genuinely either shape depending on which section renders it.
  experienceList = input<WorkHistoryEntry[]>([]);
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
