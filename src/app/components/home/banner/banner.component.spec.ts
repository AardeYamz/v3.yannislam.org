import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { BannerComponent, scrollEaseProgress } from './banner.component';
import { FloatingLogosComponent } from '../floating-logos/floating-logos.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let resumeService: jasmine.SpyObj<ResumeService>;
  let configService: jasmine.SpyObj<SiteConfigService>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);
    const resumeServiceSpy = jasmine.createSpyObj('ResumeService', ['open']);
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      data: {
        banner: {
          greeting: 'Hello',
          name: 'John Doe',
          typeSection: ['Developer', 'Designer'],
          blurb: ['I build things']
        }
      }
    });
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });

    TestBed.configureTestingModule({
      declarations: [BannerComponent, FloatingLogosComponent],
      imports: [NgxTypedJsModule],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: ResumeService, useValue: resumeServiceSpy },
        { provide: SiteConfigService, useValue: configServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    resumeService = TestBed.inject(ResumeService) as jasmine.SpyObj<ResumeService>;
    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load banner data from config service', () => {
    expect(component.data).toBeDefined();
    expect(component.data.banner.greeting).toBe('Hello');
  });

  it('openResume() logs an analytics event and opens the resume', () => {
    component.openResume();

    expect(analyticsService.sendAnalyticEvent)
      .toHaveBeenCalledWith('click_open_resume', 'banner', 'resume');
    expect(resumeService.open).toHaveBeenCalled();
  });

  it('should have analytics service', () => {
    expect(component.analyticsService).toBeDefined();
  });

  it('should have config service', () => {
    expect(component.configService).toBeDefined();
  });

  // The guided auto-scroll (scrollToAbout) drives window.scrollTo directly
  // via requestAnimationFrame rather than relying on browser/CSS smooth
  // scrolling, so it needs its own rAF plumbing here: a fake queue the test
  // advances one frame at a time with a controlled timestamp, instead of
  // real animation frames (which would make the 6-30s auto-scroll duration
  // painfully slow to actually run in a test).
  describe('scrollToAbout (auto-scroll)', () => {
    // Keyed by the id requestAnimationFrame hands back, so a matching
    // cancelAnimationFrame(id) can actually drop a still-queued callback —
    // a plain array (with cancelAnimationFrame just spied on, doing
    // nothing) would let an already-scheduled frame fire even after the
    // component "cancelled" it, which isn't how the real browser API
    // behaves and would make the cancel-on-interaction test meaningless.
    let rafCallbacks: Map<number, (t: number) => void>;
    let nextRafId: number;
    let scrollToSpy: jasmine.Spy;
    let cancelSpy: jasmine.Spy;
    let scrollYSpy: jasmine.Spy;
    let volunteeringEl: HTMLElement;

    function flushFrame(timestamp: number) {
      const callbacks = Array.from(rafCallbacks.values());
      rafCallbacks.clear();
      callbacks.forEach((cb) => cb(timestamp));
    }

    beforeEach(() => {
      rafCallbacks = new Map();
      nextRafId = 1;
      spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
        const id = nextRafId++;
        rafCallbacks.set(id, cb as (t: number) => void);
        return id;
      });
      cancelSpy = spyOn(window, 'cancelAnimationFrame').and.callFake((id: number) => {
        rafCallbacks.delete(id);
      });
      scrollToSpy = spyOn(window, 'scrollTo');
      scrollYSpy = spyOnProperty(window, 'scrollY', 'get').and.returnValue(0);
      spyOnProperty(document.documentElement, 'scrollHeight', 'get').and.returnValue(10800);
      spyOnProperty(window, 'innerHeight', 'get').and.returnValue(800);

      // A fake #volunteering section far enough down the page that the
      // computed auto-scroll distance is unambiguous and doesn't depend on
      // the real page layout (this spec never renders the rest of the home
      // page's sections).
      volunteeringEl = document.createElement('div');
      volunteeringEl.id = 'volunteering';
      Object.defineProperty(volunteeringEl, 'offsetTop', { value: 8000, configurable: true });
      Object.defineProperty(volunteeringEl, 'offsetHeight', { value: 2000, configurable: true });
      document.body.appendChild(volunteeringEl);
    });

    afterEach(() => {
      volunteeringEl.remove();
    });

    // Target = min(volunteering.offsetTop + offsetHeight - innerHeight, maxScroll)
    //        = min(8000 + 2000 - 800, 10800 - 800) = min(9200, 10000) = 9200.
    const EXPECTED_TARGET = 9200;

    it('does nothing if the target is effectively the current position', () => {
      scrollYSpy.and.returnValue(EXPECTED_TARGET);
      component.scrollToAbout();

      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('scrolls toward the target position, not away from it or past it', () => {
      component.scrollToAbout();
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

      flushFrame(0);     // first frame establishes the animation's start time
      flushFrame(3000);  // partway through
      flushFrame(30000); // finishes (duration is capped at AUTO_SCROLL_MAX_DURATION_MS = 30s)

      // scrollToAbout uses the options-object form (window.scrollTo({top,
      // left, behavior: 'instant'})), not the two-arg scrollTo(x, y) —
      // see the comment on that call in banner.component.ts for why
      // (behavior: 'instant' is required to bypass Bootstrap's
      // `scroll-behavior: smooth` on <html>, which the two-arg form would
      // otherwise inherit).
      const positions: number[] = scrollToSpy.calls.allArgs().map((args: unknown[]) => (args[0] as { top: number }).top);
      expect(positions.length).toBeGreaterThan(0);
      // Every intermediate call moved further toward the target than the
      // last, and never overshot it.
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
      }
      expect(positions[positions.length - 1]).toBeCloseTo(EXPECTED_TARGET, 0);
    });

    it('stops the animation the moment the user scrolls/drags/presses a key', () => {
      component.scrollToAbout();
      flushFrame(0);
      flushFrame(3000);
      scrollToSpy.calls.reset();

      window.dispatchEvent(new WheelEvent('wheel'));
      expect(cancelSpy).toHaveBeenCalled();

      // A frame that fires after cancellation (e.g. one already queued by
      // the browser the instant before cancelAnimationFrame ran) must not
      // still move the page — the animation is fully stopped, not paused.
      flushFrame(4000);
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('a later call replaces an in-flight auto-scroll instead of running both at once', () => {
      component.scrollToAbout();
      flushFrame(0);
      flushFrame(1000);

      component.scrollToAbout();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});

// The trapezoidal ramp-up/cruise/ramp-down velocity profile scrollToAbout
// uses instead of a single easing curve spread across the whole (up to 30s)
// duration — see the comment above its definition in banner.component.ts
// for why a full-duration ease reads as jolty on a long scroll. Pure
// function, no Angular/DOM needed to exercise it.
describe('scrollEaseProgress', () => {
  it('starts at 0 and ends exactly at 1, for both short and long durations', () => {
    for (const duration of [6000, 12000, 30000]) {
      expect(scrollEaseProgress(0, duration)).toBe(0);
      expect(scrollEaseProgress(1, duration)).toBe(1);
    }
  });

  it('is monotonically non-decreasing across the whole animation', () => {
    const duration = 30000;
    let previous = scrollEaseProgress(0, duration);
    for (let i = 1; i <= 1000; i++) {
      const current = scrollEaseProgress(i / 1000, duration);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('has no velocity discontinuity ("kink") where the ramp meets the cruise segment', () => {
    // A visible kink would itself read as a jolt even without a long slow
    // plateau — check the step size just before and after each boundary is
    // nearly identical, not just that progress itself is continuous.
    const duration = 30000;
    const dt = 1 / 100000;
    const easeMs = 600;
    const e = easeMs / duration;

    for (const boundary of [e, 1 - e]) {
      const before = scrollEaseProgress(boundary, duration) - scrollEaseProgress(boundary - dt, duration);
      const after = scrollEaseProgress(boundary + dt, duration) - scrollEaseProgress(boundary, duration);
      expect(after).toBeCloseTo(before, 6);
    }
  });

  it('reaches cruising speed within a fixed, short time no matter how long the whole scroll takes', () => {
    // This is the actual bug being fixed: a full sine ease-in-out spread
    // across the entire duration has near-zero velocity for a
    // duration-proportional stretch — on a 30s scroll, over a second at
    // each end — long enough for individual frame steps to be visible
    // before the motion "catches up" to a cruising speed, which is what
    // read as jolty. The fixed-duration ramp should be back at full speed
    // shortly after its own ~600ms window, regardless of total duration.
    //
    // Velocity is measured as a finite-difference step in *progress* over
    // a small dt, at an absolute elapsed time (700ms — just past the
    // 600ms ramp) rather than a fraction of the total duration, since
    // "does this specific point in real time feel like cruising speed
    // yet" is exactly the perceptual question that matters here.
    function velocityAt(elapsedMs: number, duration: number): number {
      const dt = 1; // 1ms finite-difference step
      const t = elapsedMs / duration;
      return (scrollEaseProgress(t + dt / duration, duration) - scrollEaseProgress(t, duration)) / dt;
    }

    for (const duration of [6000, 12000, 30000]) {
      const cruiseVelocity = velocityAt(duration / 2, duration); // definitely mid-cruise
      const velocityJustAfterRamp = velocityAt(700, duration);
      expect(velocityJustAfterRamp).toBeCloseTo(cruiseVelocity, 5);
    }
  });
});
