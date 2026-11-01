import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';

// The YL mark, one entry per piece, in the same order as yl-theme's loading screen so the two animations
// match. The points are yl-theme's logo (scripts/logo_geometry.py; see its docs/logo-geometry.md) pulled in by half
// the 4-unit stroke the SCSS draws, so the stroke's outer edge lands on the logo's real edge: the outlined mark is the
// same size as the filled one and the gaps between pieces stay equal. (yl-theme's loader does the same: LOGO_LINE.)
const PIECES: readonly { fill: string; points: string }[] = [
  { fill: '#fff200', points: '289,192.5 289,87.47 341.51,192.5' },
  { fill: '#fff200', points: '492,87.47 492,192.5 439.49,192.5' },
  { fill: '#7f7f7f', points: '390.5,260.35 363.58,206.5 417.42,206.5' },
  { fill: '#ffc90e', points: '353.83,328 293.09,206.5 347.92,206.5 381.25,273.16' },
  { fill: '#ffc90e', points: '399.75,273.16 433.08,206.5 487.91,206.5 427.17,328' },
  { fill: '#ed1c24', points: '390.5,401.33 361.66,343.65 390.5,285.97 419.34,343.65' },
  { fill: '#b5e61d', points: '383.5,422.93 383.5,668 324,668 324,541.93' },
  { fill: '#ffc90e', points: '457,541.93 457,668 397.5,668 397.5,422.93' },
  { fill: '#22b14c', points: '351.76,731 296.24,731 320.74,682 376.26,682' },
  { fill: '#ff7f27', points: '484.76,731 429.24,731 404.74,682 460.26,682' },
  { fill: '#efe4b0', points: '599.76,731 500.42,731 475.92,682 575.26,682' }
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
