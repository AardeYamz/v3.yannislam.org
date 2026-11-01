import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { AosDirective } from '../../../directives/aos/aos.directive';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective]
})
export class AboutComponent implements OnInit, OnDestroy {
  bgOpacity = signal(0.3);
  private scrollListener: (() => void) | null = null;

  analyticsService = inject(AnalyticsService);
  configService = inject(SiteConfigService);
  // Guards window/document access during SSR prerendering.
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get data() { return this.configService.data; }

  ngOnInit() {
    if (!this.isBrowser) return;
    this.scrollListener = this.onScroll.bind(this);
    window.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private onScroll() {
    const aboutSection = document.getElementById('about');
    if (!aboutSection) return;

    const rect = aboutSection.getBoundingClientRect();
    const sectionTop = rect.top;
    const sectionHeight = rect.height;

    if (sectionTop < 0) {
      const scrollDistance = Math.abs(sectionTop);
      const maxScroll = sectionHeight * 0.5;
      const opacity = Math.max(0, 0.3 - (scrollDistance / maxScroll) * 0.3);
      this.bgOpacity.set(opacity);
    } else {
      this.bgOpacity.set(0.3);
    }
  }
}
