// Deterministic gray placeholder matching the existing hand-authored
// data-URI logos in config.json (see the "cbcgb" entry), so a generated
// fallback is visually indistinguishable from a manually curated one.
export function buildFallbackLogoDataUri(organization: string): string {
  const initials = (organization || '')
    .split(/\s+/)
    .map(word => word.match(/[A-Za-z0-9]/)?.[0])
    .filter((char): char is string => !!char)
    .slice(0, 3)
    .join('')
    .toUpperCase() || '?';

  const fontSize = initials.length >= 3 ? 46 : initials.length === 2 ? 58 : 72;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
    `<rect width='200' height='200' fill='%23cccccc'/>` +
    `<text x='50%25' y='50%25' font-size='${fontSize}' font-family='sans-serif' ` +
    `text-anchor='middle' dominant-baseline='middle' fill='%23555555'>${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
}
