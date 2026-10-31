import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoLoopComponent } from './logo-loop.component';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('LogoLoopComponent', () => {
  let fixture: ComponentFixture<LogoLoopComponent>;
  let component: LogoLoopComponent;
  let mode: jasmine.Spy;

  beforeEach(() => {
    mode = jasmine.createSpy('mode').and.returnValue('default');
    TestBed.configureTestingModule({
      imports: [LogoLoopComponent],
      providers: [{ provide: ThemeService, useValue: { mode } }]
    });
    fixture = TestBed.createComponent(LogoLoopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('draws all eleven pieces of the mark', () => {
    expect(el().querySelectorAll('.logo-loop__shape').length).toBe(11);
  });

  it('staggers the loop top-left to bottom-right, each rank used once', () => {
    const ranks = component.pieces.map(p => p.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(component.pieces[0].rank).toBeLessThan(component.pieces[10].rank);
  });

  it('uses one flat colour in light and dark, the piece colours otherwise', () => {
    const piece = component.pieces[5];
    expect(component.pieceFill(piece)).toBe('#ed1c24');
    mode.and.returnValue('light');
    expect(component.pieceFill(piece)).toBe('#000000');
    mode.and.returnValue('dark');
    expect(component.pieceFill(piece)).toBe('#ffffff');
  });

  describe('dissolving on scroll to About', () => {
    let callback: IntersectionObserverCallback;

    beforeEach(() => {
      const about = document.createElement('section');
      about.id = 'about';
      document.body.appendChild(about);
      spyOn(window, 'IntersectionObserver').and.callFake(function (cb: IntersectionObserverCallback) {
        callback = cb;
        return { observe() { /* noop */ }, disconnect() { /* noop */ } } as unknown as IntersectionObserver;
      } as never);
      component.ngOnInit();
    });

    afterEach(() => document.getElementById('about')?.remove());

    const setAboutVisible = (isIntersecting: boolean) => {
      callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
      fixture.detectChanges();
    };

    it('dissolves every piece into small logos, and restores when scrolling back', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
      setAboutVisible(true);
      expect(el().querySelectorAll('.logo-loop__piece--burst').length).toBe(11);
      expect(el().querySelectorAll('.logo-loop__mini').length).toBe(11 * 7);

      setAboutVisible(false);
      expect(el().querySelectorAll('.logo-loop__piece--burst').length).toBe(0);
      expect(el().querySelectorAll('.logo-loop__mini').length).toBe(0);
    });

    it('does not dissolve on hover', () => {
      el().querySelector('.logo-loop__piece')!.dispatchEvent(new Event('pointerenter'));
      fixture.detectChanges();
      expect(el().querySelectorAll('.logo-loop__piece--burst').length).toBe(0);
    });
  });
});
