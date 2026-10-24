import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AboutComponent implements OnInit, OnDestroy {
  bgOpacity = signal(0.3);
  private scrollListener: (() => void) | null = null;

  constructor(
    public analyticsService: AnalyticsService,
    public configService: SiteConfigService
  ) { }

  get data() { return this.configService.data; }

  ngOnInit() {
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
