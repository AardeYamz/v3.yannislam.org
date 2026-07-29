import { buildFallbackLogoDataUri } from './logo-fallback';

describe('buildFallbackLogoDataUri', () => {
  it('renders the full organization name as the logo text', () => {
    expect(buildFallbackLogoDataUri('Voya Financial')).toContain('>Voya Financial<');
  });

  it('word-wraps long names across multiple lines instead of overflowing', () => {
    const svg = buildFallbackLogoDataUri('Chinese Baptist Church of Greater Boston');
    expect(svg).toContain('>Chinese Baptist<');
    expect(svg).toContain('>Church of Greater<');
    expect(svg).toContain('>Boston<');
    expect((svg.match(/<text /g) || []).length).toBeLessThanOrEqual(3);
  });

  it('falls back to a placeholder character for empty input', () => {
    expect(buildFallbackLogoDataUri('')).toContain('>?<');
  });

  it('escapes XML-significant characters in the name', () => {
    expect(buildFallbackLogoDataUri('Ben & Jerry\'s')).toContain('>Ben &amp; Jerry\'s<');
  });

  it('has no background rect (transparent, not a box)', () => {
    expect(buildFallbackLogoDataUri('Example Org')).not.toContain('<rect');
  });

  it('returns a data URI SVG that always "loads" (no network request)', () => {
    expect(buildFallbackLogoDataUri('Example Org')).toMatch(/^data:image\/svg\+xml;utf8,/);
  });
});
