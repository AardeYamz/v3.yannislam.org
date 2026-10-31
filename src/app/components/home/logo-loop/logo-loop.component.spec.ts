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

  it('fades a hovered piece into small logos, then brings it back', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    jasmine.clock().install();
    const piece = el().querySelectorAll('.logo-loop__piece')[3] as SVGGElement;
    piece.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();

    expect(piece.classList).toContain('logo-loop__piece--burst');
    expect(el().querySelectorAll('.logo-loop__mini').length).toBeGreaterThan(0);
    // other pieces are untouched
    expect(el().querySelectorAll('.logo-loop__piece--burst').length).toBe(1);

    jasmine.clock().tick(3000);
    fixture.detectChanges();
    expect(piece.classList).not.toContain('logo-loop__piece--burst');
    expect(el().querySelectorAll('.logo-loop__mini').length).toBe(0);
    jasmine.clock().uninstall();
  });
});
