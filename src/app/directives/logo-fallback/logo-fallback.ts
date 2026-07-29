// Deterministic placeholder logo for organizations without a real logo:
// the org's full name as orange text, no background box, word-wrapped to
// fit a fixed-size box so long names shrink/wrap instead of overflowing
// into whatever sits next to the logo in the layout.
const WIDTH = 320;
const HEIGHT = 120;
const MAX_LINES = 3;
const MAX_CHARS_PER_LINE = 20;

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapLines(name: string): string[] {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > MAX_CHARS_PER_LINE && lines.length < MAX_LINES - 1) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function buildFallbackLogoDataUri(organization: string, color = '#ffa500'): string {
  const name = (organization || '').trim() || '?';
  const lines = wrapLines(name);
  const longestLine = Math.max(...lines.map(line => line.length));
  const fontSize = Math.max(13, Math.min(26, Math.floor((WIDTH * 0.86) / (longestLine * 0.56))));
  const lineHeight = fontSize * 1.25;
  const centerY = HEIGHT / 2;
  const fill = encodeURIComponent(color);

  const text = lines
    .map((line, i) => {
      const y = centerY - ((lines.length - 1) / 2 - i) * lineHeight;
      return `<text x='${WIDTH / 2}' y='${y}' font-size='${fontSize}' font-weight='700' font-family='sans-serif' ` +
        `text-anchor='middle' dominant-baseline='middle' fill='${fill}'>${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}'>${text}</svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
}
