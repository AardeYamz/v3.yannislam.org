import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';
import logoGeometry from 'src/generated/logo-geometry.json';

// The mark's polygons come from yl-theme (fetched by scripts/fetch-theme.js into src/generated/), in the same order as
// its loader so the two animations match. This mark draws a 4-unit stroke (see the SCSS), so it takes each piece's
// `line` polygon: pulled in by half the stroke, which puts the stroke's outer edge on the logo's real edge and keeps
// the outlined mark the size of the filled one with equal gaps. The stroke width is the geometry's `stroke` too (set on
// the polygons in the template), so the two cannot disagree.
const PIECES: readonly { fill: string; points: string }[] = logoGeometry.pieces.map(p => ({ fill: p.fill, points: p.line }));

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
  readonly stroke = logoGeometry.stroke;

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
