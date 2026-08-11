import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, Inject, OnDestroy, PLATFORM_ID, QueryList, ViewChild, ViewChildren, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { YL_SHAPE_BOUNDS, packPointsInYlShape } from './yl-shape';

// Each mode is a different way of arranging and moving the same field of
// little YL logos behind the banner:
//
//   'falling' — the original: logos drift down forever in non-overlapping
//               vertical lanes.
//   'mosaic'  — logos are scattered inside the outline of the YL mark so the
//               crowd reads as one big YL, then idle in place.
export type BackgroundMode = 'falling' | 'mosaic';

// The modes a page load is allowed to pick from. Commenting a mode out of
// this list disables it without deleting any of its code.
const ENABLED_MODES: readonly BackgroundMode[] = [
  // TEMP (testing the mosaic): the original falling animation is commented
  // out so every load shows the new one. Un-comment this line to put it back
  // in the rotation.
  // 'falling',
  'mosaic'
];

export interface ModeConfig {
  /** Random logo count per load, inclusive range. */
  readonly minCount: number;
  readonly maxCount: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly minOpacity: number;
  readonly maxOpacity: number;
  readonly maxRotationDeg: number;
}

export const MODE_CONFIG: Record<BackgroundMode, ModeConfig> = {
  // This sits behind the banner's greeting only (see banner.component.html),
  // not the whole page, so a much smaller count than a full-viewport effect.
  falling: {
    minCount: 20,
    maxCount: 40,
    minSize: 22,
    maxSize: 48,
    minOpacity: 0.16,
    maxOpacity: 0.38,
    maxRotationDeg: 25
  },
  // Smaller, far more numerous and more opaque than the falling field: the
  // silhouette only reads as a YL if the pieces are small relative to the
  // whole mark, and each logo inks maybe a fifth of its own box (it's a thin
  // figure on transparent ground), so a count that looks generous on paper
  // still comes out as a faint scatter. Also tilted more freely, since here
  // the crowd *is* the picture and no two neighbors should look stamped.
  mosaic: {
    minCount: 180,
    maxCount: 240,
    minSize: 14,
    maxSize: 30,
    minOpacity: 0.3,
    maxOpacity: 0.6,
    maxRotationDeg: 40
  }
};

interface FloatingLogo {
  id: number;
  variant: string;
  size: number;
  rotation: number;

  /** Opacity the logo settles at. */
  opacity: number;
  /**
   * Opacity the element is rendered with before the animation loop takes
   * over — the value the template binds. Mosaic logos start invisible and
   * fade in (see `entranceProgress`); falling logos are up from first paint.
   */
  initialOpacity: number;

  // --- 'falling' mode -----------------------------------------------------
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

  // --- 'mosaic' mode ------------------------------------------------------
  // Resting spot inside the big YL, in host pixels (top-left of the element,
  // so the layout pass has already subtracted half a logo). Assigned by
  // layoutMosaic() since it depends on the host's measured size.
  anchorX: number;
  anchorY: number;

  // Slow elliptical idle orbit around the anchor, so a mosaic that has
  // finished assembling still breathes instead of freezing.
  driftX: number;
  driftY: number;
  driftFreq: number;
  driftPhase: number;

  /** Seconds into the animation before this logo starts fading in. */
  appearAt: number;
  /** Set once the fade-in has been written at full strength. */
  entranceDone: boolean;

  /**
   * Last transform written to the DOM, so an unchanged one can be skipped.
   * Worth it in mosaic mode, where the logo count is high and the idle orbit
   * is slow enough that a good share of logos round to the same 0.1px
   * position two frames running — measured at ~99 writes per frame instead of
   * 202 on a settled desktop mosaic.
   */
  lastTransform: string;

  // --- shared -------------------------------------------------------------
  // Temporary hover-dodge displacement, added on top of the resting
  // position. dodgeX/Y is what's actually rendered; it eases toward
  // dodgeTargetX/Y each frame, and the target itself relaxes back to zero
  // over time — so a dodge is a smooth pursuit of a decaying target in both
  // directions, never an instant jump. In falling mode this is the one
  // deliberate exception to the no-overlap guarantee above: a dodge can
  // briefly push a logo past its lane's edge before it settles back.
  dodgeX: number;
  dodgeY: number;
  dodgeTargetX: number;
  dodgeTargetY: number;
}

// Flat-color variants that stay visible against both the light and dark
// themes; black/white are theme-matched elsewhere (see ThemeService) so
// they'd blend into a same-color background here.
const VARIANTS = ['clearcolor', 'gray', 'yellow', 'gold', 'red', 'lime', 'green', 'orange', 'cream'];

const FALLING = MODE_CONFIG.falling;
const LANE_GAP_PX = 14;

// getBoundingClientRect() on a rotated element returns its axis-aligned
// bounding box, which is wider/taller than the unrotated size — up to
// size * (cos + sin) of the rotation angle. Lanes are sized for that
// worst case (rotation clamped to +/-maxRotationDeg) so two full-size,
// max-rotated neighbors still can't touch.
const ROT_INFLATE =
  Math.cos(FALLING.maxRotationDeg * Math.PI / 180) + Math.sin(FALLING.maxRotationDeg * Math.PI / 180);
const EFFECTIVE_MAX_FOOTPRINT_PX = FALLING.maxSize * ROT_INFLATE;
const LANE_WIDTH_PX = EFFECTIVE_MAX_FOOTPRINT_PX + LANE_GAP_PX;
const VERTICAL_SPACING_PX = EFFECTIVE_MAX_FOOTPRINT_PX + LANE_GAP_PX;
const MIN_SPEED_PX_S = 18;
const MAX_SPEED_PX_S = 55;

// Used when the host hasn't been measured yet (or has no layout box at all,
// e.g. under Karma), so a layout pass can never divide by a zero-sized box.
export const FALLBACK_HOST_BOX = { width: 1200, height: 800 };

// Mosaic layout. The mark is tall and narrow (~314x651 shape units), so it
// is scaled to the host's height and, on wide screens, parked to the right of
// the banner copy (which is left-aligned and capped at 500px) instead of
// sitting on top of it. Below that width there's nowhere to hide, so it just
// centers.
const MOSAIC_FILL = 0.72;
const MOSAIC_WIDE_HOST_PX = 992;
const MOSAIC_WIDE_CENTER_RATIO = 0.72;

// A centered mark lands squarely on the banner copy, so the whole layer is
// dimmed as a group (this multiplies with each logo's own opacity) to keep the
// text readable. Off to the side there's no such conflict and the logos are
// shown at full strength.
const MOSAIC_CENTERED_DIM = 0.4;

/**
 * Where the big YL sits in a host box of the given size: `scale` is host
 * pixels per shape unit, and `originX/originY` are the top-left of the scaled
 * mark. Shape-unit point (x, y) maps to
 * `originX + (x - YL_SHAPE_BOUNDS.minX) * scale`, and likewise for y.
 * `centered` is true when the host was too narrow to park the mark beside the
 * copy.
 */
export function mosaicPlacement(width: number, height: number): { scale: number; originX: number; originY: number; centered: boolean } {
  const scale = Math.min(
    (width * MOSAIC_FILL) / YL_SHAPE_BOUNDS.width,
    (height * MOSAIC_FILL) / YL_SHAPE_BOUNDS.height
  );
  const centered = width < MOSAIC_WIDE_HOST_PX;
  const centerRatio = centered ? 0.5 : MOSAIC_WIDE_CENTER_RATIO;
  return {
    scale,
    centered,
    originX: width * centerRatio - (YL_SHAPE_BOUNDS.width * scale) / 2,
    originY: (height - YL_SHAPE_BOUNDS.height * scale) / 2
  };
}

// Logos are mostly transparent inside their square box, so packing on the
// full half-size would leave the shape looking gappy; this shrinks the
// keep-apart radius so neighbors interlock without visibly stacking.
const MOSAIC_PACK = 0.55;
const MOSAIC_DRIFT_MIN_PX = 2;
const MOSAIC_DRIFT_MAX_PX = 7;
const MOSAIC_DRIFT_MIN_HZ = 0.04;
const MOSAIC_DRIFT_MAX_HZ = 0.14;

// Staggered fade + scale-up as the shape assembles itself on load.
const MOSAIC_ENTRANCE_STAGGER_S = 1.6;
const MOSAIC_ENTRANCE_DURATION_S = 0.7;
const MOSAIC_ENTRANCE_START_SCALE = 0.4;

// Hover dodge: a small, smoothly-eased nudge away from the cursor, not a
// snap. DODGE_APPROACH controls how quickly the rendered position chases
// the (also-decaying) target each frame; DODGE_TARGET_DECAY controls how
// long the "push" lingers before relaxing back to the resting position.
const DODGE_DISTANCE_MIN_PX = 30;
const DODGE_DISTANCE_MAX_PX = 60;
const DODGE_MAX_PX = 90;
const DODGE_APPROACH = 0.12;
const DODGE_TARGET_DECAY = 0.94;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

@Component({
  selector: 'app-floating-logos',
  templateUrl: './floating-logos.component.html',
  styleUrls: ['./floating-logos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FloatingLogosComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('logoEl') private logoEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('layer') private layer!: ElementRef<HTMLElement>;

  readonly mode: BackgroundMode = ENABLED_MODES[Math.floor(Math.random() * ENABLED_MODES.length)];
  readonly config: ModeConfig = MODE_CONFIG[this.mode];
  readonly logos: FloatingLogo[] = this.generateLogos();

  // Lets the stylesheet tell the modes apart (see the .scss).
  @HostBinding('class') readonly modeClass = `mode-${this.mode}`;

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
    this.resizeTimeout = setTimeout(() => this.layout(), 200);
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

    this.layout();

    // layout() only computes where each logo belongs - it doesn't itself
    // move anything, since the actual DOM write happens in render(). Without
    // this call, the very first paint (whether that's a cold client bootstrap
    // or hydrating a prerendered page, where the static HTML has no transform
    // on these elements at all) shows every logo stacked at the container's
    // (0,0) corner until the rAF loop's first tick fires and calls render() a
    // frame later - a visible pile that then jumps out to its real layout.
    // Rendering once here, synchronously, means the correct layout is what
    // actually gets painted first. (Mosaic logos are also transparent until
    // their entrance starts, so for them this is what puts them in the right
    // place to fade in from, rather than fixing a visible pile.)
    this.render(0);

    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (this.prefersReducedMotion) {
      return;
    }

    this.startLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    clearTimeout(this.resizeTimeout);
    if (this.isBrowser) {
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  // Anchors `start` so that `now - start` (in tick) continues from
  // `this.elapsedS` rather than restarting at zero — resuming after a
  // pause (e.g. tab was hidden) picks up right where it left off instead
  // of jumping the logos back to their starting position.
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

    const { x, y } = this.restPosition(logo, this.elapsedS);
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const dx = (hostRect.left + x + logo.dodgeX + logo.size / 2) - event.clientX;
    const dy = (hostRect.top + y + logo.dodgeY + logo.size / 2) - event.clientY;
    const len = Math.hypot(dx, dy) || 1;
    const distance = randomBetween(DODGE_DISTANCE_MIN_PX, DODGE_DISTANCE_MAX_PX);

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

  private layout(): void {
    switch (this.mode) {
      case 'falling':
        this.layoutLanes();
        return;
      case 'mosaic':
        this.layoutMosaic();
        return;
    }
  }

  // The position a logo would occupy at a given elapsed time under its
  // mode's own motion, before any hover-dodge offset is added.
  private restPosition(logo: FloatingLogo, elapsedS: number): { x: number; y: number } {
    switch (this.mode) {
      case 'falling': {
        const cyclePos =
          ((logo.phase + logo.speed * elapsedS) % logo.trackLength + logo.trackLength) % logo.trackLength;
        const sway = logo.swayAmplitude * Math.sin(elapsedS * logo.swayFreq + logo.swayPhase);
        return { x: logo.laneX + sway, y: cyclePos - logo.size };
      }
      case 'mosaic': {
        const angle = elapsedS * logo.driftFreq * Math.PI * 2 + logo.driftPhase;
        return {
          x: logo.anchorX + Math.cos(angle) * logo.driftX,
          y: logo.anchorY + Math.sin(angle) * logo.driftY
        };
      }
    }
  }

  // 0 -> not yet arrived, 1 -> fully assembled. Reduced motion skips
  // straight to the finished shape.
  private entranceProgress(logo: FloatingLogo, elapsedS: number): number {
    if (this.prefersReducedMotion) return 1;
    const t = (elapsedS - logo.appearAt) / MOSAIC_ENTRANCE_DURATION_S;
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(1 - t, 3); // easeOutCubic
  }

  private render(elapsedMs: number): void {
    this.elapsedS = elapsedMs / 1000;

    for (let i = 0; i < this.logos.length; i++) {
      const logo = this.logos[i];
      const el = this.elements[i];
      if (!el) continue;

      const { x, y } = this.restPosition(logo, this.elapsedS);

      logo.dodgeTargetX *= DODGE_TARGET_DECAY;
      logo.dodgeTargetY *= DODGE_TARGET_DECAY;
      logo.dodgeX += (logo.dodgeTargetX - logo.dodgeX) * DODGE_APPROACH;
      logo.dodgeY += (logo.dodgeTargetY - logo.dodgeY) * DODGE_APPROACH;

      let transform =
        `translate3d(${(x + logo.dodgeX).toFixed(1)}px, ${(y + logo.dodgeY).toFixed(1)}px, 0) rotate(${logo.rotation}deg)`;

      // Opacity is only touched while a logo is still arriving; once it has
      // been written at full strength the template's binding owns it again,
      // so the steady state costs one style write per logo per frame, same
      // as falling mode.
      if (this.mode === 'mosaic' && !logo.entranceDone) {
        const progress = this.entranceProgress(logo, this.elapsedS);
        logo.entranceDone = progress === 1;
        el.style.opacity = (logo.opacity * progress).toFixed(3);
        if (!logo.entranceDone) {
          const scale = MOSAIC_ENTRANCE_START_SCALE + (1 - MOSAIC_ENTRANCE_START_SCALE) * progress;
          transform += ` scale(${scale.toFixed(3)})`;
        }
      }

      if (transform !== logo.lastTransform) {
        el.style.transform = transform;
        logo.lastTransform = transform;
      }
    }
  }

  private hostBox(): { width: number; height: number } {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return {
      width: rect.width || FALLBACK_HOST_BOX.width,
      height: rect.height || FALLBACK_HOST_BOX.height
    };
  }

  private layoutLanes(): void {
    const { width, height } = this.hostBox();
    const cols = Math.max(1, Math.floor(width / LANE_WIDTH_PX));

    const perColumn: FloatingLogo[][] = Array.from({ length: cols }, () => []);
    this.logos.forEach((logo, i) => perColumn[i % cols].push(logo));

    perColumn.forEach((column, colIndex) => {
      if (column.length === 0) return;

      const laneX = colIndex * LANE_WIDTH_PX + (LANE_WIDTH_PX - FALLING.maxSize) / 2;
      const trackLength = Math.max(height + FALLING.maxSize * 2, column.length * VERTICAL_SPACING_PX);
      const speed = randomBetween(MIN_SPEED_PX_S, MAX_SPEED_PX_S);
      const step = trackLength / column.length;
      // Every column's k=0 item would otherwise sit at the exact same
      // phase (0) as every other column's k=0 item - each column's own
      // track is independent, so "phase 0" means something different in
      // absolute pixels per column, but they all still land at the same
      // relative y (-size) at elapsedS=0, which reads as one dead-straight
      // horizontal line of logos rather than a scatter. A random per-column
      // offset (added to, not replacing, k*step - so it doesn't disturb the
      // even in-column spacing) breaks that alignment without touching the
      // non-overlap guarantee, which only depends on neighbors within the
      // same column staying `step` apart.
      const phaseOffset = Math.random() * trackLength;

      column.forEach((logo, k) => {
        logo.laneX = laneX;
        logo.trackLength = trackLength;
        // Exact multiples of `step` (no jitter) — this is what keeps the
        // gap between lane-mates at a guaranteed >= VERTICAL_SPACING_PX,
        // so they can never overlap each other on the shared track.
        logo.phase = (k * step + phaseOffset) % trackLength;
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

  // Scatters the logos across the YL mark's outline: yl-shape.ts packs one
  // point per logo inside the shape (in its own 800x800 coordinate space),
  // and this maps those points into the host box.
  private layoutMosaic(): void {
    const { width, height } = this.hostBox();
    const { scale, originX, originY, centered } = mosaicPlacement(width, height);

    // Group opacity on the layer, not per logo, so it also applies to logos
    // that already finished fading in — and so a resize across the breakpoint
    // takes effect without restarting the entrance.
    this.layer.nativeElement.style.opacity = centered ? String(MOSAIC_CENTERED_DIM) : '';

    // Keep-apart radii have to be expressed in shape units, since that's the
    // space the packing runs in.
    const radii = this.logos.map(logo => (logo.size / 2) * MOSAIC_PACK / scale);
    const points = packPointsInYlShape(radii);

    this.logos.forEach((logo, i) => {
      const point = points[i];
      // translate3d() moves the element's top-left corner, so bias by half a
      // logo to land its center on the sampled point.
      logo.anchorX = originX + (point.x - YL_SHAPE_BOUNDS.minX) * scale - logo.size / 2;
      logo.anchorY = originY + (point.y - YL_SHAPE_BOUNDS.minY) * scale - logo.size / 2;
    });
  }

  private generateLogos(): FloatingLogo[] {
    const { minCount, maxCount, minSize, maxSize, minOpacity, maxOpacity, maxRotationDeg } = this.config;
    const count = Math.round(randomBetween(minCount, maxCount));

    return Array.from({ length: count }, (_, i) => {
      const opacity = randomBetween(minOpacity, maxOpacity);
      return {
        id: i,
        variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
        size: Math.round(randomBetween(minSize, maxSize)),
        rotation: (Math.random() * 2 - 1) * maxRotationDeg,
        opacity,
        initialOpacity: this.mode === 'mosaic' ? 0 : opacity,
        laneX: 0,
        trackLength: 1,
        phase: 0,
        speed: 0,
        swayAmplitude: 0,
        swayFreq: randomBetween(0.6, 1.4),
        swayPhase: Math.random() * Math.PI * 2,
        anchorX: 0,
        anchorY: 0,
        driftX: randomBetween(MOSAIC_DRIFT_MIN_PX, MOSAIC_DRIFT_MAX_PX),
        driftY: randomBetween(MOSAIC_DRIFT_MIN_PX, MOSAIC_DRIFT_MAX_PX),
        driftFreq: randomBetween(MOSAIC_DRIFT_MIN_HZ, MOSAIC_DRIFT_MAX_HZ),
        driftPhase: Math.random() * Math.PI * 2,
        appearAt: Math.random() * MOSAIC_ENTRANCE_STAGGER_S,
        entranceDone: false,
        lastTransform: '',
        dodgeX: 0,
        dodgeY: 0,
        dodgeTargetX: 0,
        dodgeTargetY: 0
      };
    });
  }
}
