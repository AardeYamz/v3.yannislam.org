import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    // `*` (every descendant) is the wrong query here: the header's markup
    // duplicates every nav item inside the mobile drawer (.menu-responsive)
    // and also always includes the desktop-only nav list, both hidden via
    // CSS depending on viewport width but still present in the DOM — so
    // querySelectorAll matches them regardless, and their ~40 combined
    // descendant elements each claim a 50ms stagger slot ahead of the
    // theme toggle and hamburger button in DOM order. On mobile that left
    // the hamburger sitting at opacity 0 (invisible, unusable) for over a
    // second after the header itself became visible. Staggering just the
    // 4 top-level chrome groups (logo, nav-right, hamburger wrapper,
    // mobile drawer) as blocks instead of every nested span/li fixes that
    // and still reads as a staggered entrance.
    fadeStaggerAnimation('animateMenu', 'translateX(-20px)', '.container > *')
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class HeaderComponent {

  responsiveMenuVisible: Boolean = false;
  pageYPosition!: number;
  languageFormControl: FormControl = new FormControl();
  menu: any[];

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public themeService: ThemeService,
    private resumeService: ResumeService,
    configService: SiteConfigService,
  ) {
    this.menu = configService.menu;
  }

  scroll(el: string) {
    if (document.getElementById(el)) {
      document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/home']).then(() => document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' }));
    }
    this.responsiveMenuVisible = false;
  }

  navigate(menuItem: any) {
    if (menuItem?.scrollSection) {
      this.scroll(menuItem.scrollSection);
    } else if (menuItem?.siteLocation) {
      this.router.navigateByUrl(menuItem.siteLocation);
      this.responsiveMenuVisible = false;
    }
  }

  toggleTheme() {
    this.themeService.cycle();
    this.analyticsService.sendAnalyticEvent('theme_toggle', 'header', this.themeService.mode());
  }

  downloadResume() {
    this.resumeService.open();
  }

  @HostListener('window:scroll')
  getScrollPosition() {
    this.pageYPosition = window.scrollY;
  }

  // Scroll distance (px) over which the logo completes exactly one turn, then holds at 360deg.
  private static readonly LOGO_ROTATION_SCROLL_PX = 900;

  get logoRotationDeg(): number {
    // On a page shorter than LOGO_ROTATION_SCROLL_PX, scrollY can never
    // reach it, so the spin used to stall partway through and just sit
    // there. Scale the distance-per-turn down to whatever's actually
    // scrollable so short pages still land on a full turn by the bottom.
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    const rotationDistance = maxScroll > 0
      ? Math.min(HeaderComponent.LOGO_ROTATION_SCROLL_PX, maxScroll)
      : HeaderComponent.LOGO_ROTATION_SCROLL_PX;
    const progress = Math.min((this.pageYPosition || 0) / rotationDistance, 1);
    return progress * 360;
  }

}