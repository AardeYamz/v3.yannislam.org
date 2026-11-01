import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';

// The YL mark, one entry per piece, verbatim from the `<polygon>`s in
// clearcolor.svg, the theme's logo (logos/logo.svg.tmpl in yl-theme; same 800x800 viewBox space), in the
// same order as yl-theme's loading screen so the two animations match.
const PIECES: readonly { fill: string; points: string }[] = [
  { fill: '#fff200', points: '287,194 287,80 343,194' },
  { fill: '#fff200', points: '437,194 493,80 493,194' },
  { fill: '#7f7f7f', points: '360,204 420,204 390,265' },
  { fill: '#ffc90e', points: '354,333 289,203 348,203 384,275' },
  { fill: '#ffc90e', points: '425,333 396,275 432,203 491,203' },
  { fill: '#ed1c24', points: '361,342 390,284 419,342 390,402' },
  { fill: '#b5e61d', points: '323,539 384,417 384,670 323,670' },
  { fill: '#ffc90e', points: '396,412 458,538 458,670 396,670' },
  { fill: '#22b14c', points: '321,680 377,680 352,731 295,731' },
  { fill: '#ff7f27', points: '484,731 427,731 402,681 458,681' },
  { fill: '#efe4b0', points: '601,731 496,731 471,681 575,681' }
];

interface Piece {
  index: number;
  fill: string;
  points: string;
  // Centre of the piece's bounding box.
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

@Component({
  selector: 'app-logo-loop',
  templateUrl: './logo-loop.component.html',
  styleUrls: ['./logo-loop.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoLoopComponent {
  private themeService = inject(ThemeService);

  readonly pieces = PIECE_LIST;

  // Matches clearcolor/black/white.svg: full colour for the default theme,
  // one flat colour for light/dark (same rule as the loading screen).
  pieceFill(piece: Piece): string {
    switch (this.themeService.mode()) {
      case 'light': return '#000000';
      case 'dark': return '#ffffff';
      default: return piece.fill;
    }
  }
}
