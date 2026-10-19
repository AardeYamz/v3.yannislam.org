import { ICONS, svgMarkup } from './icon-registry';

describe('icon-registry', () => {
  it('produces a valid <svg> string for a known icon', () => {
    const markup = svgMarkup('fa-github');

    expect(markup).toContain('<svg');
    expect(markup).toContain(ICONS['fa-github'].viewBox);
    expect(markup).toContain(ICONS['fa-github'].path);
  });

  it('returns an empty string for an unknown icon name', () => {
    expect(svgMarkup('fa-does-not-exist')).toBe('');
  });

  it('aliases fa-external-link-alt to the same glyph as fa-up-right-from-square', () => {
    expect(ICONS['fa-external-link-alt']).toBe(ICONS['fa-up-right-from-square']);
  });

  it('every path uses currentColor so icons pick up the surrounding text color', () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      expect(svgMarkup(name)).toContain('fill="currentColor"');
      expect(icon.path.length).toBeGreaterThan(0);
    }
  });
});
