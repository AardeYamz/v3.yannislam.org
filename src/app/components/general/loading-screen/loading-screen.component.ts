import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { animate, createTimeline, JSAnimation, random, stagger } from 'animejs';

// Center of the logo artwork's 0 0 800 800 viewBox, used to fly each piece
// in from the direction it sits away from the mark's middle.
const VIEWBOX_CENTER = 400;
const FLY_DISTANCE = 300;

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

    animate(pieces, {
      translateX: (el: any) => [this.radialOffset(el).x, 0],
      translateY: (el: any) => [this.radialOffset(el).y, 0],
      rotate: () => [random(-50, 50), 0],
      scale: [0.25, 1],
      opacity: [0, 1],
      duration: 800,
      delay: stagger(45, { from: 'center' }),
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

  // Direction a piece flies in from: away from the artwork's center, along the
  // line from center to the piece's own bounding-box center.
  private radialOffset(el: SVGGraphicsElement): { x: number; y: number } {
    const box = el.getBBox();
    const dx = (box.x + box.width / 2) - VIEWBOX_CENTER;
    const dy = (box.y + box.height / 2) - VIEWBOX_CENTER;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: (dx / dist) * FLY_DISTANCE, y: (dy / dist) * FLY_DISTANCE };
  }
}
