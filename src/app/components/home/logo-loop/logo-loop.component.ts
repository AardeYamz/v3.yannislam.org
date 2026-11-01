import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';

// The YL mark, one entry per piece, verbatim from the `<polygon>`s in
// clearcolor.svg, the theme's logo (logos/logo.svg.tmpl in yl-theme; same 800x800 viewBox space), in the
// same order as yl-theme's loading screen so the two animations match.
const PIECES: readonly { fill: string; points: string }[] = [
  { fill: '#fff200', points: '287,195 287,79 345,195' },
  { fill: '#fff200', points: '494,195 494,79 436,195' },
  { fill: '#7f7f7f', points: '359,203.5 422,203.5 390.5,266.5' },
  { fill: '#ffc90e', points: '355,335 289,203 349,203 385,275' },
  { fill: '#ffc90e', points: '426,335 396,275 432,203 492,203' },
  { fill: '#ed1c24', points: '359.5,343.5 390.5,281.5 421.5,343.5 390.5,405.5' },
  { fill: '#b5e61d', points: '322,539 386,411 386,671 322,671' },
  { fill: '#ffc90e', points: '395,411 459,539 459,671 395,671' },
  { fill: '#22b14c', points: '320,679 380,679 353,733 293,733' },
  { fill: '#ff7f27', points: '487,733 427,733 400,679 460,679' },
  { fill: '#efe4b0', points: '603,733 497,733 470,679 576,679' }
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
