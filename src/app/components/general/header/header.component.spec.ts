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
    configService = { menu: [{ navTitle: 'About', scrollSection: 'about' }] };

    component = new HeaderComponent(
      router as any,
      analyticsService as any,
      themeService as any,
      configService as any
    );
  });

  afterEach(() => {
    document.querySelectorAll('meta[name="resume-file"]').forEach((el) => el.remove());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the menu from SiteConfigService', () => {
    expect(component.menu).toEqual(configService.menu);
  });

  describe('navigate()', () => {
    it('scrolls to the section when the menu item has a scrollSection', () => {
      spyOn(component, 'scroll');

      component.navigate({ scrollSection: 'about' });

      expect(component.scroll).toHaveBeenCalledWith('about');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('navigates by URL when the menu item only has a siteLocation', () => {
      component.responsiveMenuVisible = true;

      component.navigate({ siteLocation: '/projects' });

      expect(router.navigateByUrl).toHaveBeenCalledWith('/projects');
      expect(component.responsiveMenuVisible).toBeFalse();
    });

    it('does nothing for a menu item with neither field', () => {
      component.navigate({});

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('toggleTheme() cycles the theme and logs the resulting mode as an analytics event', () => {
    component.toggleTheme();

    expect(themeService.cycle).toHaveBeenCalled();
    expect(analyticsService.sendAnalyticEvent).toHaveBeenCalledWith('theme_toggle', 'header', 'dark');
  });

  describe('logoRotationDeg', () => {
    it('is 0 before any scrolling', () => {
      component.pageYPosition = 0;
      expect(component.logoRotationDeg).toBe(0);
    });

    it('scales linearly up to 900px of scroll', () => {
      component.pageYPosition = 450;
      expect(component.logoRotationDeg).toBe(180);
    });

    it('holds at 360deg for any scroll depth beyond 900px', () => {
      component.pageYPosition = 5000;
      expect(component.logoRotationDeg).toBe(360);
    });
  });

  describe('downloadResume()', () => {
    function setResumeMeta(content: string): void {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'resume-file');
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }

    it('opens the build-time-resolved resume filename as an absolute, encoded URL', () => {
      setResumeMeta('Yannis Lam Resume 20260706.pdf');
      spyOn(window, 'open');

      component.downloadResume();

      expect(window.open).toHaveBeenCalledWith(
        `${window.location.origin}/assets/resume/Yannis%20Lam%20Resume%2020260706.pdf`,
        '_blank'
      );
    });

    it('does not open anything when the build-time placeholder was never resolved', () => {
      setResumeMeta('%RESUME_FILENAME%');
      spyOn(window, 'open');
      spyOn(console, 'warn');

      component.downloadResume();

      expect(window.open).not.toHaveBeenCalled();
    });

    it('does not open anything when the resume-file meta tag is missing entirely', () => {
      spyOn(window, 'open');
      spyOn(console, 'warn');

      component.downloadResume();

      expect(window.open).not.toHaveBeenCalled();
    });
  });
});
