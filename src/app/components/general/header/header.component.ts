import { Component, HostListener, ChangeDetectionStrategy, AfterViewInit, OnDestroy, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
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
    // theme toggle and menu-toggle button in DOM order. On mobile that left
    // the menu toggle sitting at opacity 0 (invisible, unusable) for over a
    // second after the header itself became visible. Staggering just the
    // 4 top-level chrome groups (logo, nav-right, menu toggle, mobile
    // drawer) as blocks instead of every nested span/li fixes that and
    // still reads as a staggered entrance.
    fadeStaggerAnimation('animateMenu', 'translateX(-20px)', '.container > *')
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})

export class HeaderComponent implements AfterViewInit, OnDestroy {

  responsiveMenuVisible: Boolean = false;
  pageYPosition!: number;
  languageFormControl: FormControl = new FormControl();
  menu: any[];

  // Which section (menuItem.scrollSection) is currently scrolled into view,
  // used to highlight the matching nav item — see setupSectionObserver().
  // A signal rather than a plain property since it's written from an
  // IntersectionObserver callback, which runs outside any Angular template
  // binding; under zoneless change detection only signal writes (or an
  // explicit markForCheck) are guaranteed to refresh an OnPush view.
  activeSection = signal<string>('');

  private sectionObserver?: IntersectionObserver;
  private routerSubscription?: Subscription;
  // Sections currently intersecting the observed band, tracked across
  // callbacks — see setupSectionObserver() for why a single callback's
  // `entries` isn't enough on its own.
  private readonly visibleSections = new Set<string>();

  // Domino (Angular's server-side DOM emulation) provides a `window`/`document`
  // stand-in during prerendering, but layout/scroll APIs like `scrollY`,
  // `innerHeight` and `scrollIntoView` aren't meaningfully implemented there,
  // so scroll-driven behavior is gated on this flag and only runs client-side.
  private readonly isBrowser: boolean;

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public themeService: ThemeService,
    private resumeService: ResumeService,
    configService: SiteConfigService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.menu = configService.menu;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    // IntersectionObserver doesn't exist in Domino's server-side DOM
    // emulation (see isBrowser above) — scroll-spy is a browser-only
    // enhancement, so skip setting it up entirely during prerendering.
    if (!this.isBrowser) return;

    this.setupSectionObserver();
    // Routes other than "/" (e.g. /projects, /aardeyamz) don't have these
    // section ids in the DOM at all, and navigating back to "/" mounts a
    // fresh HomeComponent — re-run the observer setup after every
    // navigation so it always matches what's actually on the page.
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => setTimeout(() => this.setupSectionObserver()));
  }

  ngOnDestroy() {
    this.sectionObserver?.disconnect();
    this.routerSubscription?.unsubscribe();
  }

  private setupSectionObserver() {
    this.sectionObserver?.disconnect();
    this.visibleSections.clear();

    const sections = this.menu
      .map((menuItem) => menuItem?.scrollSection)
      .filter((id): id is string => !!id)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!sections.length) {
      this.activeSection.set('');
      return;
    }

    // Shrinks the observed viewport to a thin horizontal band starting
    // just below the fixed nav bar and ending halfway down — a section is
    // "active" once its content crosses that band, which reads as the
    // section the user is currently looking at rather than merely
    // scrolled past. Measuring the nav's actual rendered height rather
    // than hardcoding it keeps the band correctly placed at the
    // 120px/140px nav heights the large-viewport breakpoints use (see
    // styles.scss), not just the base 100px bar.
    const navHeight = document.querySelector('nav.on-top')?.getBoundingClientRect().height ?? 100;

    // A section taller than the band (workhistory/volunteering both are)
    // can still be intersecting when the *next* section enters the band,
    // so a single callback's `entries` only ever contains the sections
    // whose state just changed — not the full set of what's currently
    // visible. Tracking membership in visibleSections across callbacks
    // fixes two bugs a per-batch read had: a still-active section's exit
    // (like workhistory's, while volunteering is entering) would count as
    // "nothing visible" and freeze the stale highlight instead of just
    // dropping the section that actually left, and reducing over only the
    // batch could hand the win to whichever section happened to fire last
    // rather than whichever is actually topmost.
    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.visibleSections.add(entry.target.id);
        } else {
          this.visibleSections.delete(entry.target.id);
        }
      });
      // `sections` is already in document order, so the first one that's
      // still visible is the topmost.
      const topmost = sections.find((section) => this.visibleSections.has(section.id));
      this.activeSection.set(topmost?.id ?? '');
    }, { rootMargin: `-${navHeight + 10}px 0px -55% 0px`, threshold: 0 });

    sections.forEach((section) => this.sectionObserver!.observe(section));
  }

  scroll(el: string) {
    if (!this.isBrowser) return;

    if (document.getElementById(el)) {
      document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/home']).then(() => document?.getElementById(el)?.scrollIntoView({ behavior: 'smooth' }));
    }
    this.responsiveMenuVisible = false;
  }

  // .menu-responsive is a full-viewport overlay with the drawer <aside>
  // docked to its right edge — clicking anywhere in the remaining space is
  // a click on the overlay itself, not on anything nested inside it, so
  // target === currentTarget is enough to tell "outside the drawer" apart
  // from a click that bubbled up from a link/button within it.
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.responsiveMenuVisible = false;
    }
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
    if (!this.isBrowser) return;
    this.pageYPosition = window.scrollY;
  }

  // Scroll distance (px) over which the logo completes exactly one turn, then holds at 360deg.
  private static readonly LOGO_ROTATION_SCROLL_PX = 900;

  get logoRotationDeg(): number {
    if (!this.isBrowser) return 0;

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