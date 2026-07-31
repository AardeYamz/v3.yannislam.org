import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, OnDestroy, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, createTimeline, JSAnimation, random, stagger } from 'animejs';
import { ThemeService } from 'src/app/services/theme/theme.service';

// How far (in the artwork's 0 0 800 800 viewBox units) each piece starts
// offset up and to the left of its resting position.
const FLY_DISTANCE = 260;

// Floor so a fast load doesn't just flash the intro and immediately cut to
// the outro before the assembly animation (and a beat of the breathe loop)
// has had a chance to actually play.
const MIN_DISPLAY_MS = 1400;

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

  hidden = false;

  private breathe?: JSAnimation;

  // `document` doesn't exist and animejs has nothing to animate during
  // server-side prerendering (Node has no DOM), so the whole intro/outro
  // sequence is skipped there in favor of immediately reporting "finished"
  // so the header still renders into the static HTML.
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

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      // Skip the animated intro/outro entirely on the server and report
      // completion right away, so prerendered HTML includes the header
      // instead of being stuck behind a loading state that never finishes.
      this.hidden = true;
      this.finished.emit();
      return;
    }

    document.body.style.overflow = 'hidden';
    this.playIntro();

    // The page behind this overlay has nothing left to actually wait for:
    // its content comes from config.json, bundled at build time rather than
    // fetched, so it's already fully rendered by the time this view inits.
    // `window.load` doesn't reflect that — it waits on unrelated resources
    // (fonts, third-party logos, analytics) that can stall for seconds on a
    // flaky connection, during which this overlay's logo was left floating
    // on top of an already-live, already-interactive page underneath. A
    // fixed minimum display is what the intro animation actually needs.
    setTimeout(() => this.playOutro(), MIN_DISPLAY_MS);
  }

  ngOnDestroy(): void {
    this.breathe?.revert();
  }

  private playIntro(): void {
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
    this.breathe = animate(this.logoGroupRef.nativeElement, {
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
    const logoGroup = this.logoGroupRef.nativeElement;

    createTimeline()
      .add(logoGroup, { scale: 1.1, duration: 200, ease: 'outQuad' })
      .add(overlay, {
        opacity: [1, 0],
        duration: 500,
        ease: 'inOutQuad',
        onComplete: () => {
          // `hidden` gates the template's [class.loading-screen--hidden]
          // binding, but this callback comes from animejs's own rAF-driven
          // timeline, not an Angular-bound event, so under OnPush the view
          // wouldn't otherwise be marked dirty here — without markForCheck()
          // the overlay would never actually fade/hide.
          this.hidden = true;
          this.cdr.markForCheck();
          document.body.style.overflow = '';
          this.finished.emit();
        }
      }, '+=150');
  }

  // A piece's position along the top-left -> bottom-right diagonal, used to
  // order the assembly sweep.
  private diagonalPosition(el: SVGGraphicsElement): number {
    const box = el.getBBox();
    return (box.x + box.width / 2) + (box.y + box.height / 2);
  }
}
