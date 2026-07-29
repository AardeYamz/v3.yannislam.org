import { buildFallbackLogoDataUri } from './logo-fallback';

describe('buildFallbackLogoDataUri', () => {
  it('builds initials from the first letter of up to three words', () => {
    expect(buildFallbackLogoDataUri('Voya Financial')).toContain('>VF<');
    expect(buildFallbackLogoDataUri('Chinese Baptist Church of Greater Boston')).toContain('>CBC<');
  });

  it('uppercases initials taken from lowercase input', () => {
    expect(buildFallbackLogoDataUri('home depot')).toContain('>HD<');
  });

  it('falls back to a placeholder character for empty input', () => {
    expect(buildFallbackLogoDataUri('')).toContain('>?<');
  });

  it('returns a data URI SVG that always "loads" (no network request)', () => {
    expect(buildFallbackLogoDataUri('Example Org')).toMatch(/^data:image\/svg\+xml;utf8,/);
  });
});
