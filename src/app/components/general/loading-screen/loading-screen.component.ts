import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { animate, createTimeline, JSAnimation } from 'animejs';

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LoadingScreenComponent implements AfterViewInit, OnDestroy {
  @ViewChild('overlay', { static: true }) overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('logo', { static: true }) logoRef!: ElementRef<HTMLImageElement>;
  @ViewChild('barFill', { static: true }) barFillRef!: ElementRef<HTMLDivElement>;

  @Output() finished = new EventEmitter<void>();

  hidden = false;

  // Floor on how long the screen stays up so fast page loads don't produce a flash.
  private readonly minDisplayMs = 1100;
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
    const logo = this.logoRef.nativeElement;
    const barFill = this.barFillRef.nativeElement;

    createTimeline()
      .add(logo, {
        opacity: [0, 1],
        scale: [0.55, 1],
        rotate: [-12, 0],
        duration: 900,
        ease: 'outElastic(1, .6)'
      })
      .add(barFill, {
        width: ['0%', '78%'],
        duration: 1000,
        ease: 'inOutQuad'
      }, '-=500');

    // Gentle idle pulse while the real page finishes loading in the background.
    this.breathe = animate(logo, {
      scale: [1, 1.045],
      duration: 900,
      ease: 'inOutSine',
      loop: true,
      alternate: true,
      delay: 900
    });
  }

  private playOutro(): void {
    this.breathe?.revert();

    const overlay = this.overlayRef.nativeElement;
    const logo = this.logoRef.nativeElement;
    const barFill = this.barFillRef.nativeElement;

    createTimeline()
      .add(barFill, { width: '100%', duration: 300, ease: 'outQuad' })
      .add(logo, { scale: 1.08, duration: 200, ease: 'outQuad' }, '-=150')
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
}
