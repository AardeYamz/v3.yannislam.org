import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { animate, createTimeline, JSAnimation, random, stagger } from 'animejs';
import { ThemeService } from 'src/app/services/theme/theme.service';

// How far (in the artwork's 0 0 800 800 viewBox units) each piece starts
// offset up and to the left of its resting position.
const FLY_DISTANCE = 260;

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LoadingScreenComponent implements AfterViewInit, OnDestroy {
  @ViewChild('overlay', { static: true }) overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('logoGroup', { static: true }) logoGroupRef!: ElementRef<SVGGElement>;

  @Output() finished = new EventEmitter<void>();

  hidden = false;

  // Floor on how long the screen stays up so fast page loads don't produce a flash.
  private readonly minDisplayMs = 1400;
  private breathe?: JSAnimation;

  constructor(private themeService: ThemeService) { }

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
    document.body.style.overflow = 'hidden';
    this.playIntro();

    const minDisplay = new Promise<void>(resolve => setTimeout(resolve, this.minDisplayMs));
    const pageReady = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { once: true }));

    Promise.all([minDisplay, pageReady]).then(() => this.playOutro());
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
          this.hidden = true;
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
