import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, OnDestroy, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { JSAnimation } from 'animejs';
import { ThemeService } from 'src/app/services/theme/theme.service';

// How far (in the artwork's 0 0 800 800 viewBox units) each piece starts
// offset up and to the left of its resting position.
const FLY_DISTANCE = 260;

// Floor so a fast load doesn't just flash the intro and immediately cut to
// the outro before the assembly animation (and a beat of the breathe loop)
// has had a chance to actually play.
const MIN_DISPLAY_MS = 1400;

// With prefers-reduced-motion, the intro/breathe/scale-punch are skipped
// entirely (see ngAfterViewInit/playOutro) - this just holds the overlay up
// briefly so it doesn't look like a single flickered frame.
const REDUCED_MOTION_DISPLAY_MS = 300;

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LoadingScreenComponent implements AfterViewInit, OnDestroy {
  @ViewChild('overlay', { static: true }) overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('logoGroup', { static: true }) logoGroupRef!: ElementRef<SVGGElement>;

  @Output() finished = new EventEmitter<void>();

  // Deliberately the same default on the server and on every client boot
  // (cold or hydrating a prerendered page) - see ngAfterViewInit's server
  // branch for why that consistency matters.
  hidden = false;

  private breathe?: JSAnimation;
  private finishTimer?: ReturnType<typeof setTimeout>;
  // Lazily loaded in ngAfterViewInit, see there for why - undefined whenever
  // no real (non-reduced-motion) animation ever ran, including on the server.
  private animejs?: typeof import('animejs');

  // `document` doesn't exist and animejs has nothing to animate during
  // server-side prerendering (Node has no DOM), so the intro/outro sequence
  // is skipped there - but unlike an earlier version of this guard, it does
  // NOT jump `hidden` to `true`/emit `finished` to fake a "just finished"
  // state. Doing that made the prerendered HTML's overlay already hidden,
  // which is a *different* value than the `false` a real client naturally
  // boots with - hydrating that mismatch made the loading screen visibly
  // pop back up over an already-rendered page and replay the whole ~2s
  // animation a second time. Leaving `hidden` at its plain default here
  // means server and client always agree on the starting point, so the
  // animation just plays once, normally, exactly like a non-SSR boot -
  // AppComponent.headerReady is what actually keeps the header (and the
  // rest of the page underneath this overlay) present in the prerendered
  // HTML for SEO/crawlability, independent of this component entirely.
  private readonly isBrowser: boolean;

  constructor(
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Matches clearcolor/black/white.svg: full color for the default theme,
  // a single flat fill for light/dark so the intro matches the header logo.
  pieceFill(defaultColor: string): string {
    switch (this.themeService.mode()) {
      case 'light': return '#000000';
      case 'dark': return '#ffffff';
      default: return defaultColor;
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) {
      // No DOM/animejs on the server, so there's nothing to animate - but
      // also nothing has actually finished yet, so `hidden` is deliberately
      // left at its plain `false` default here (see the field's doc
      // comment) rather than being forced to `true`/emitting `finished`.
      return;
    }

    document.body.style.overflow = 'hidden';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finishTimer = setTimeout(() => this.playOutro(), REDUCED_MOTION_DISPLAY_MS);
      return;
    }

    // Kept out of the initial bundle - only ever needed by this one
    // (unskippable, above-the-fold) intro animation, so it's fetched as its
    // own lazy chunk instead of shipping in every page load.
    this.animejs = await import('animejs');
    this.playIntro();

    // The page behind this overlay has nothing left to actually wait for:
    // its content comes from config.json, bundled at build time rather than
    // fetched, so it's already fully rendered by the time this view inits.
    // `window.load` doesn't reflect that — it waits on unrelated resources
    // (fonts, third-party logos, analytics) that can stall for seconds on a
    // flaky connection, during which this overlay's logo was left floating
    // on top of an already-live, already-interactive page underneath. A
    // fixed minimum display is what the intro animation actually needs.
    this.finishTimer = setTimeout(() => this.playOutro(), MIN_DISPLAY_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.finishTimer);
    this.breathe?.revert();
    if (this.isBrowser) {
      // Undoes ngAfterViewInit's `overflow = 'hidden'` in case this
      // component is destroyed before playOutro's onComplete ever runs to
      // restore it itself - otherwise the whole page is left unscrollable.
      document.body.style.overflow = '';
    }
  }

  private playIntro(): void {
    const { animate, random, stagger } = this.animejs!;
    const pieces = Array.from(this.logoGroupRef.nativeElement.querySelectorAll<SVGGraphicsElement>('.logo-piece'));

    // Sort top-left -> bottom-right so the default (first-to-last) stagger
    // sweeps the assembly diagonally across the mark in that direction.
    pieces.sort((a, b) => this.diagonalPosition(a) - this.diagonalPosition(b));

    animate(pieces, {
      translateX: [-FLY_DISTANCE, 0],
      translateY: [-FLY_DISTANCE, 0],
      rotate: () => [random(-30, 30), 0],
      scale: [0.25, 1],
      opacity: [0, 1],
      duration: 700,
      delay: stagger(60),
      ease: 'outElastic(1, .7)',
      onComplete: () => this.playBreathe()
    });
  }

  private playBreathe(): void {
    this.breathe = this.animejs!.animate(this.logoGroupRef.nativeElement, {
      scale: [1, 1.035],
      duration: 1000,
      ease: 'inOutSine',
      loop: true,
      alternate: true
    });
  }

  private playOutro(): void {
    this.breathe?.revert();

    const overlay = this.overlayRef.nativeElement;
    const finish = () => {
      // This callback comes from animejs's own rAF-driven timeline (or, for
      // reduced motion, runs synchronously outside any Angular-bound event)
      // rather than a template binding, so under OnPush the view wouldn't
      // otherwise be marked dirty here — without markForCheck() the overlay
      // would never actually fade/hide.
      this.hidden = true;
      this.cdr.markForCheck();
      document.body.style.overflow = '';
      this.finished.emit();
    };

    if (!this.animejs) {
      overlay.style.opacity = '0';
      finish();
      return;
    }

    const logoGroup = this.logoGroupRef.nativeElement;
    this.animejs.createTimeline()
      .add(logoGroup, { scale: 1.1, duration: 200, ease: 'outQuad' })
      .add(overlay, {
        opacity: [1, 0],
        duration: 500,
        ease: 'inOutQuad',
        onComplete: finish
      }, '+=150');
  }

  // A piece's position along the top-left -> bottom-right diagonal, used to
  // order the assembly sweep.
  private diagonalPosition(el: SVGGraphicsElement): number {
    const box = el.getBBox();
    return (box.x + box.width / 2) + (box.y + box.height / 2);
  }
}
