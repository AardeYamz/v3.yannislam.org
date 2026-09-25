import { signal } from '@angular/core';
import { HeaderComponent } from './header.component';

// These tests instantiate HeaderComponent directly (not through TestBed +
// its real template), which needs NgbModule/RouterModule/FormsModule from
// GeneralModule to render. That keeps this suite focused on the component's
// own logic (navigation, theme toggling, resume resolution, scroll-driven
// rotation) without depending on the full Angular/ng-bootstrap module wiring.
describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let router: { navigate: jasmine.Spy; navigateByUrl: jasmine.Spy };
  let analyticsService: { sendAnalyticEvent: jasmine.Spy };
  let themeService: { cycle: jasmine.Spy; mode: jasmine.Spy };
  let resumeService: { open: jasmine.Spy };
  let scrollService: { y: ReturnType<typeof signal<number>>; maxScroll: ReturnType<typeof signal<number>> };
  let configService: { menu: any[] };

  beforeEach(() => {
    router = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    };
    analyticsService = { sendAnalyticEvent: jasmine.createSpy('sendAnalyticEvent') };
    themeService = {
      cycle: jasmine.createSpy('cycle'),
      mode: jasmine.createSpy('mode').and.returnValue('dark'),
    };
    resumeService = { open: jasmine.createSpy('open') };
    scrollService = { y: signal(0), maxScroll: signal(0) };
    configService = { menu: [{ navTitle: 'About', scrollSection: 'about' }] };

    component = new HeaderComponent(
      router as any,
      analyticsService as any,
      themeService as any,
      resumeService as any,
      scrollService as any,
      {} as any, // Injector -- only used inside ngAfterViewInit, not exercised here
      configService as any,
      'browser' as any
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the menu from SiteConfigService', () => {
    expect(component.menu).toEqual(configService.menu);
  });

  describe('navigate()', () => {
    it('logs an analytics event for the menu item regardless of its shape', () => {
      component.navigate({ navTitle: 'About', scrollSection: 'about' });

      expect(analyticsService.sendAnalyticEvent).toHaveBeenCalledWith('About', 'menu', 'click');
    });

    it('scrolls to the section when the menu item has a scrollSection', () => {
      spyOn(component, 'scroll');

      component.navigate({ scrollSection: 'about' });

      expect(component.scroll).toHaveBeenCalledWith('about');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('navigates by URL when the menu item only has a siteLocation', () => {
      component.responsiveMenuVisible.set(true);

      component.navigate({ siteLocation: '/projects' });

      expect(router.navigateByUrl).toHaveBeenCalledWith('/projects');
      expect(component.responsiveMenuVisible()).toBeFalse();
    });

    it('does nothing for a menu item with neither field', () => {
      component.navigate({});

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('onBackdropClick()', () => {
    it('closes the mobile menu when the click lands directly on the overlay', () => {
      component.responsiveMenuVisible.set(true);
      const overlay = document.createElement('div');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: overlay });
      Object.defineProperty(event, 'currentTarget', { value: overlay });

      component.onBackdropClick(event);

      expect(component.responsiveMenuVisible()).toBeFalse();
    });

    it('leaves the menu open when the click bubbled up from inside the drawer', () => {
      component.responsiveMenuVisible.set(true);
      const overlay = document.createElement('div');
      const drawerLink = document.createElement('a');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: drawerLink });
      Object.defineProperty(event, 'currentTarget', { value: overlay });

      component.onBackdropClick(event);

      expect(component.responsiveMenuVisible()).toBeTrue();
    });
  });

  it('toggleTheme() cycles the theme and logs the resulting mode as an analytics event', () => {
    component.toggleTheme();

    expect(themeService.cycle).toHaveBeenCalled();
    expect(analyticsService.sendAnalyticEvent).toHaveBeenCalledWith('theme_toggle', 'header', 'dark');
  });

  describe('hasScrolled', () => {
    it('is false at the top of the page', () => {
      scrollService.y.set(0);
      expect(component.hasScrolled()).toBeFalse();
    });

    it('is true once the page has scrolled at all', () => {
      scrollService.y.set(1);
      expect(component.hasScrolled()).toBeTrue();
    });
  });

  describe('logoRotationDeg', () => {
    it('is 0 before any scrolling', () => {
      scrollService.maxScroll.set(2000);
      scrollService.y.set(0);
      expect(component.logoRotationDeg()).toBe(0);
    });

    it('scales linearly up to 900px of scroll on a page long enough to reach it', () => {
      scrollService.maxScroll.set(2000);
      scrollService.y.set(450);
      expect(component.logoRotationDeg()).toBe(180);
    });

    it('holds at 360deg for any scroll depth beyond 900px', () => {
      scrollService.maxScroll.set(2000);
      scrollService.y.set(5000);
      expect(component.logoRotationDeg()).toBe(360);
    });

    it('scales the full turn down to fit a page shorter than 900px of scroll', () => {
      scrollService.maxScroll.set(200);
      scrollService.y.set(100);
      expect(component.logoRotationDeg()).toBe(180);
    });

    it('completes exactly one turn at the bottom of a short page', () => {
      scrollService.maxScroll.set(200);
      scrollService.y.set(200);
      expect(component.logoRotationDeg()).toBe(360);
    });

    it('falls back to the fixed 900px distance when the page cannot scroll at all', () => {
      scrollService.maxScroll.set(0);
      scrollService.y.set(0);
      expect(component.logoRotationDeg()).toBe(0);
    });
  });

  it('downloadResume() delegates to ResumeService', () => {
    component.downloadResume();

    expect(resumeService.open).toHaveBeenCalled();
  });
});
