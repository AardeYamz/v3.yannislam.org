import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    fadeStaggerAnimation('animateMenu', 'translateY(-50%)')
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
    // Filename is resolved at build time (scripts/inject-env.js) from
    // whichever dated file in src/assets/resume/ is newest, so it never
    // needs to be hardcoded here — see index.html's "resume-file" meta tag.
    const filename = document.querySelector('meta[name="resume-file"]')?.getAttribute('content');
    if (!filename || filename.includes('%')) {
      // Unresolved placeholder (e.g. `ng serve`, which skips the postbuild
      // step) or no dated resume file found at build time.
      console.warn('[header] Resume filename not resolved; skipping download.');
      return;
    }
    window.open(`${window.location.origin}/assets/resume/${encodeURIComponent(filename)}`, "_blank");
  }

  @HostListener('window:scroll')
  getScrollPosition() {
    this.pageYPosition = window.scrollY;
  }

  // Scroll distance (px) over which the logo completes exactly one turn, then holds at 360deg.
  private static readonly LOGO_ROTATION_SCROLL_PX = 900;

  get logoRotationDeg(): number {
    const progress = Math.min((this.pageYPosition || 0) / HeaderComponent.LOGO_ROTATION_SCROLL_PX, 1);
    return progress * 360;
  }

}