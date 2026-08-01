import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, PLATFORM_ID, QueryList, ViewChildren, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from 'src/app/services/theme/theme.service';

interface FloatingLogo {
  id: number;
  variant: string;
  size: number;
  rotation: number;
  opacity: number;

  // Lane layout: every logo is confined to a fixed-width vertical lane and,
  // within that lane, to an evenly-spaced position on a looping fall track
  // shared with its lane-mates. Same lane speed + even phase spacing means
  // lane-mates keep a constant gap forever, so nothing can catch up to and
  // overlap the item ahead of it — the non-overlap guarantee is structural,
  // not something that has to be checked/corrected frame to frame.
  laneX: number;
  trackLength: number;
  phase: number;
  speed: number;

  // Small bounded side-to-side sway as it falls, kept inside the lane's
  // free margin so neighboring lanes' logos can never drift into contact.
  swayAmplitude: number;
  swayFreq: number;
  swayPhase: number;

  // Temporary hover-dodge displacement, added on top of the lane position.
  // dodgeX/Y is what's actually rendered; it eases toward dodgeTargetX/Y
  // each frame, and the target itself relaxes back to zero over time — so
  // a dodge is a smooth pursuit of a decaying target in both directions,
  // never an instant jump. This is the one deliberate exception to the
  // no-overlap guarantee above: a dodge can briefly push a logo past its
  // lane's edge before it settles back.
  dodgeX: number;
  dodgeY: number;
  dodgeTargetX: number;
  dodgeTargetY: number;
}

// Flat-color variants that stay visible against both the light and dark
// themes; black/white are theme-matched elsewhere (see ThemeService) so
// they'd blend into a same-color background here.
const VARIANTS = ['clearcolor', 'gray', 'yellow', 'gold', 'red', 'lime', 'green', 'orange', 'cream'];

// This sits behind the banner's greeting only (see banner.component.html),
// not the whole page, so a much smaller count than a full-viewport effect.
const MIN_LOGO_COUNT = 20;
const MAX_LOGO_COUNT = 40;
const MIN_SIZE_PX = 22;
const MAX_SIZE_PX = 48;
const LANE_GAP_PX = 14;
const ROT_MAX_DEG = 25;

// getBoundingClientRect() on a rotated element returns its axis-aligned
// bounding box, which is wider/taller than the unrotated size — up to
// size * (cos + sin) of the rotation angle. Lanes are sized for that
// worst case (rotation clamped to +/-ROT_MAX_DEG) so two full-size,
// max-rotated neighbors still can't touch.
const ROT_INFLATE = Math.cos(ROT_MAX_DEG * Math.PI / 180) + Math.sin(ROT_MAX_DEG * Math.PI / 180);
const EFFECTIVE_MAX_FOOTPRINT_PX = MAX_SIZE_PX * ROT_INFLATE;
const LANE_WIDTH_PX = EFFECTIVE_MAX_FOOTPRINT_PX + LANE_GAP_PX;
const VERTICAL_SPACING_PX = EFFECTIVE_MAX_FOOTPRINT_PX + LANE_GAP_PX;
const MIN_SPEED_PX_S = 18;
const MAX_SPEED_PX_S = 55;

// Hover dodge: a small, smoothly-eased nudge away from the cursor, not a
// snap. DODGE_APPROACH controls how quickly the rendered position chases
// the (also-decaying) target each frame; DODGE_TARGET_DECAY controls how
// long the "push" lingers before relaxing back to the resting track.
const DODGE_DISTANCE_MIN_PX = 30;
const DODGE_DISTANCE_MAX_PX = 60;
const DODGE_MAX_PX = 90;
const DODGE_APPROACH = 0.12;
const DODGE_TARGET_DECAY = 0.94;

@Component({
  selector: 'app-floating-logos',
  templateUrl: './floating-logos.component.html',
  styleUrls: ['./floating-logos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FloatingLogosComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('logoEl') private logoEls!: QueryList<ElementRef<HTMLElement>>;

  readonly logos: FloatingLogo[] = this.generateLogos();

  // Domino (Angular's server-side DOM emulation used during prerendering)
  // defines a `window` global but doesn't implement layout/media APIs like
  // `matchMedia` or `getBoundingClientRect`, so a plain `typeof window`
  // check isn't enough here - this uses Angular's PLATFORM_ID instead, and
  // every browser-only code path below (including the resize listener and
  // rAF-driven animation loop) is gated on it.
  private readonly isBrowser: boolean;
  private readonly prefersReducedMotion: boolean;

  private elements: HTMLElement[] = [];
  private rafId?: number;
  private elapsedS = 0;
  private resizeTimeout?: ReturnType<typeof setTimeout>;
  private readonly onResize = () => {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.layoutLanes(), 200);
  };

  private isFirstThemeCheck = true;

  constructor(
    private host: ElementRef<HTMLElement>,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.prefersReducedMotion = this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Re-randomize colors whenever the user toggles the theme. Skipped on
    // the first run (effects fire once immediately on creation) since
    // generateLogos() already picked initial colors.
    //
    // This effect fires from the reactive graph, not from a template-bound
    // DOM event, so under OnPush it wouldn't otherwise be picked up: the
    // view isn't automatically marked dirty just because a constructor
    // effect ran, and reshuffleColors() mutates `logo.variant` (a plain
    // field on an object already in `logos`, read by [src] in the
    // template) in place rather than replacing the array. markForCheck()
    // makes that in-place update visible on the next tick.
    effect(() => {
      this.themeService.mode();
      if (this.isFirstThemeCheck) {
        this.isFirstThemeCheck = false;
        return;
      }
      this.reshuffleColors();
      this.cdr.markForCheck();
    });
  }

  // Pauses/resumes the rAF loop when the tab is hidden/shown, so a
  // backgrounded tab doesn't keep burning CPU/battery on an animation
  // nobody can see. No-op under reduced motion, since there's no loop
  // running to pause in the first place (render(0) already drew the
  // static final frame).
  private readonly onVisibilityChange = () => {
    if (this.prefersReducedMotion) return;

    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  ngAfterViewInit(): void {
    this.elements = this.logoEls.map(ref => ref.nativeElement);

    // getBoundingClientRect(), the resize listener, and the rAF animation
    // loop below all need real layout/browser APIs that don't exist during
    // server-side prerendering.
    if (!this.isBrowser) return;

    this.layoutLanes();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (this.prefersReducedMotion) {
      this.render(0);
      return;
    }

    this.startLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    clearTimeout(this.resizeTimeout);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  // Anchors `start` so that `now - start` (in tick) continues from
  // `this.elapsedS` rather than restarting at zero — resuming after a
  // pause (e.g. tab was hidden) picks up right where it left off instead
  // of jumping the logos back to their track's starting position.
  private startLoop(): void {
    const start = performance.now() - this.elapsedS * 1000;
    const tick = (now: number) => {
      this.render(now - start);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }

  // Sets a target displacement away from the cursor; render() eases the
  // logo toward it (and the target itself decays back to zero) so the
  // whole dodge — out and back — is smooth, never an instant jump.
  onDodge(event: MouseEvent, logo: FloatingLogo): void {
    if (this.prefersReducedMotion) return;

    const { x, y } = this.trackPosition(logo, this.elapsedS);
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const dx = (hostRect.left + x + logo.dodgeX + logo.size / 2) - event.clientX;
    const dy = (hostRect.top + y + logo.dodgeY + logo.size / 2) - event.clientY;
    const len = Math.hypot(dx, dy) || 1;
    const distance = DODGE_DISTANCE_MIN_PX + Math.random() * (DODGE_DISTANCE_MAX_PX - DODGE_DISTANCE_MIN_PX);

    const nextX = logo.dodgeTargetX + (dx / len) * distance;
    const nextY = logo.dodgeTargetY + (dy / len) * distance;
    const mag = Math.hypot(nextX, nextY) || 1;
    const clamp = Math.min(mag, DODGE_MAX_PX) / mag;
    logo.dodgeTargetX = nextX * clamp;
    logo.dodgeTargetY = nextY * clamp;
  }

  // Gives every logo a new color, distinct from its current one, so a
  // theme change reads as a visible reshuffle rather than a coin flip.
  private reshuffleColors(): void {
    for (const logo of this.logos) {
      let next = logo.variant;
      while (next === logo.variant) {
        next = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
      }
      logo.variant = next;
    }
  }

  // The lane/sway position a logo would occupy at a given elapsed time,
  // before any hover-dodge offset is added.
  private trackPosition(logo: FloatingLogo, elapsedS: number): { x: number; y: number } {
    const cyclePos = ((logo.phase + logo.speed * elapsedS) % logo.trackLength + logo.trackLength) % logo.trackLength;
    const y = cyclePos - logo.size;
    const sway = logo.swayAmplitude * Math.sin(elapsedS * logo.swayFreq + logo.swayPhase);
    return { x: logo.laneX + sway, y };
  }

  private render(elapsedMs: number): void {
    this.elapsedS = elapsedMs / 1000;

    for (let i = 0; i < this.logos.length; i++) {
      const logo = this.logos[i];
      const el = this.elements[i];
      if (!el) continue;

      const { x, y } = this.trackPosition(logo, this.elapsedS);

      logo.dodgeTargetX *= DODGE_TARGET_DECAY;
      logo.dodgeTargetY *= DODGE_TARGET_DECAY;
      logo.dodgeX += (logo.dodgeTargetX - logo.dodgeX) * DODGE_APPROACH;
      logo.dodgeY += (logo.dodgeTargetY - logo.dodgeY) * DODGE_APPROACH;

      el.style.transform =
        `translate3d(${(x + logo.dodgeX).toFixed(1)}px, ${(y + logo.dodgeY).toFixed(1)}px, 0) rotate(${logo.rotation}deg)`;
    }
  }

  private layoutLanes(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 800;
    const cols = Math.max(1, Math.floor(width / LANE_WIDTH_PX));

    const perColumn: FloatingLogo[][] = Array.from({ length: cols }, () => []);
    this.logos.forEach((logo, i) => perColumn[i % cols].push(logo));

    perColumn.forEach((column, colIndex) => {
      if (column.length === 0) return;

      const laneX = colIndex * LANE_WIDTH_PX + (LANE_WIDTH_PX - MAX_SIZE_PX) / 2;
      const trackLength = Math.max(height + MAX_SIZE_PX * 2, column.length * VERTICAL_SPACING_PX);
      const speed = MIN_SPEED_PX_S + Math.random() * (MAX_SPEED_PX_S - MIN_SPEED_PX_S);
      const step = trackLength / column.length;

      column.forEach((logo, k) => {
        logo.laneX = laneX;
        logo.trackLength = trackLength;
        // Exact multiples of `step` (no jitter) — this is what keeps the
        // gap between lane-mates at a guaranteed >= VERTICAL_SPACING_PX,
        // so they can never overlap each other on the shared track.
        logo.phase = k * step;
        logo.speed = speed;

        // Use this item's own rotated footprint (not just its raw size) so
        // the sway range can't push a tilted logo into the lane's margin.
        const rotRad = logo.rotation * Math.PI / 180;
        const inflatedSize = logo.size * (Math.abs(Math.cos(rotRad)) + Math.abs(Math.sin(rotRad)));
        const freeMargin = Math.max(0, (LANE_WIDTH_PX - inflatedSize) / 2);
        logo.swayAmplitude = Math.min(10, freeMargin * 0.7);
      });
    });
  }

  private generateLogos(): FloatingLogo[] {
    const count = Math.round(MIN_LOGO_COUNT + Math.random() * (MAX_LOGO_COUNT - MIN_LOGO_COUNT));
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
      size: Math.round(MIN_SIZE_PX + Math.random() * (MAX_SIZE_PX - MIN_SIZE_PX)),
      rotation: (Math.random() * 2 - 1) * ROT_MAX_DEG,
      opacity: 0.16 + Math.random() * 0.22,
      laneX: 0,
      trackLength: 1,
      phase: 0,
      speed: 0,
      swayAmplitude: 0,
      swayFreq: 0.6 + Math.random() * 0.8,
      swayPhase: Math.random() * Math.PI * 2,
      dodgeX: 0,
      dodgeY: 0,
      dodgeTargetX: 0,
      dodgeTargetY: 0
    }));
  }
}
