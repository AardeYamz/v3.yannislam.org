import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    trigger("animateMenu", [
      transition(":enter", [
        query("*", [
          style({ opacity: 0, transform: "translateY(-50%)" }),
          stagger(50, [
            animate("250ms cubic-bezier(0.35, 0, 0.25, 1)", style({ opacity: 1, transform: "none" }))
          ])
        ])
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class HeaderComponent implements OnInit {

  responsiveMenuVisible: Boolean = false;
  pageYPosition!: number;
  languageFormControl: FormControl = new FormControl();
  resumeFile: string = "Yannis Lam Resume 20241225.pdf";
  data: any = jsonData;

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public themeService: ThemeService,
  ) { }

  ngOnInit(): void {
  }

  menu: any[] = this.data.siteMenu;

  scroll(el: string) {
    if (document.getElementById(el)) {
      document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/home']).then(() => document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' }));
    }
    this.responsiveMenuVisible = false;
  }

  toggleTheme() {
    this.themeService.cycle();
    this.analyticsService.sendAnalyticEvent('theme_toggle', 'header', this.themeService.mode());
  }

  downloadResume() {
    // app url
    let url = window.location.href;
    // Open a new window with the CV
    window.open(url + "/../assets/resume/" + this.resumeFile, "_blank");
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