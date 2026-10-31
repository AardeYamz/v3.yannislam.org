import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from 'src/app/services/theme/theme.service';

// The YL mark, one entry per piece, verbatim from the `<polygon>`s in
// src/assets/images/logos/clearcolor.svg (same 800x800 viewBox space), in the
// same order as yl-theme's loading screen so the two animations match.
const PIECES: readonly { fill: string; points: string }[] = [
  { fill: '#fff200', points: '287,194 287,80 343,193' },
  { fill: '#fff200', points: '437,194 493,80 493,194' },
  { fill: '#7f7f7f', points: '360,204 420,204 390,265' },
  { fill: '#ffc90e', points: '354,333 289,203 348,203 384,275' },
  { fill: '#ffc90e', points: '425,333 396,275 432,203 491,203' },
  { fill: '#ed1c24', points: '361,342 390,284 419,342 390,402' },
  { fill: '#b5e61d', points: '323,539 384,417 384,667 323,669' },
  { fill: '#ffc90e', points: '395,412 458,538 458,670 396,670' },
  { fill: '#22b14c', points: '321,680 377,680 352,731 295,731' },
  { fill: '#ff7f27', points: '484,731 427,731 402,681 458,680' },
  { fill: '#efe4b0', points: '601,731 496,731 471,681 575,680' }
];

interface Piece {
  index: number;
  fill: string;
  points: string;
  // Centre of the piece's bounding box, where its small logos spawn.
  cx: number;
  cy: number;
  // Position in the top-left -> bottom-right sweep, which staggers the loop.
  rank: number;
}

const BASE_PIECES: Piece[] = PIECES.map((p, index) => {
  const pts = p.points.split(' ').map(xy => xy.split(',').map(Number));
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { index, ...p, cx, cy, rank: 0 };
});

const PIECE_LIST: readonly Piece[] = [...BASE_PIECES]
  .sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy))
  .map((p, rank) => ({ ...p, rank }))
  .sort((a, b) => a.index - b.index);

// One small logo in a burst from a hovered piece.
interface Mini {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  rotation: number;
  delayMs: number;
}

const MINIS_PER_PIECE = 7;
const MIN_MINI_SIZE = 34;
const MAX_MINI_SIZE = 62;
const SCATTER_MIN = 40;
const SCATTER_MAX = 110;
// The `logo-loop-mini` animation (2.3s) plus its longest stagger delay
// (250ms), after which the piece fades back in.
const BURST_MS = 2600;

@Component({
  selector: 'app-logo-loop',
  templateUrl: './logo-loop.component.html',
  styleUrls: ['./logo-loop.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoLoopComponent implements OnDestroy {
  private themeService = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly pieces = PIECE_LIST;

  // piece index -> its live burst. Only ever written from hover, in the
  // browser, so the random positions never reach the prerendered HTML.
  readonly bursts = signal<Record<number, Mini[] | undefined>>({});
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  // Matches clearcolor/black/white.svg: full colour for the default theme,
  // one flat colour for light/dark (same rule as the loading screen).
  pieceFill(piece: Piece): string {
    switch (this.themeService.mode()) {
      case 'light': return '#000000';
      case 'dark': return '#ffffff';
      default: return piece.fill;
    }
  }

  miniSrc(): string {
    switch (this.themeService.mode()) {
      case 'light': return 'assets/images/logos/black.svg';
      case 'dark': return 'assets/images/logos/white.svg';
      default: return 'assets/images/logos/clearcolor.svg';
    }
  }

  onHover(piece: Piece): void {
    if (!this.isBrowser || this.bursts()[piece.index]) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const minis: Mini[] = Array.from({ length: MINIS_PER_PIECE }, (_, i) => {
      const angle = (i / MINIS_PER_PIECE) * Math.PI * 2 + Math.random() * 0.8;
      const distance = SCATTER_MIN + Math.random() * (SCATTER_MAX - SCATTER_MIN);
      const size = MIN_MINI_SIZE + Math.random() * (MAX_MINI_SIZE - MIN_MINI_SIZE);
      return {
        x: piece.cx - size / 2,
        y: piece.cy - size / 2,
        size,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rotation: (Math.random() * 2 - 1) * 50,
        delayMs: Math.round(Math.random() * 250)
      };
    });
    this.bursts.update(b => ({ ...b, [piece.index]: minis }));

    this.timers.set(piece.index, setTimeout(() => {
      this.bursts.update(b => ({ ...b, [piece.index]: undefined }));
      this.timers.delete(piece.index);
    }, BURST_MS));
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }
}
