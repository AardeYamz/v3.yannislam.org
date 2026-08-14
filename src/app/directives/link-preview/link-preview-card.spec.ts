import { domainFromUrl, iconForUrl, isPreviewableUrl } from './link-preview-card';

describe('isPreviewableUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isPreviewableUrl('https://example.com')).toBeTrue();
    expect(isPreviewableUrl('http://example.com')).toBeTrue();
  });

  it('rejects non-web schemes and empty values', () => {
    expect(isPreviewableUrl('mailto:test@example.com')).toBeFalse();
    expect(isPreviewableUrl('')).toBeFalse();
    expect(isPreviewableUrl(undefined)).toBeFalse();
    expect(isPreviewableUrl(null)).toBeFalse();
  });
});

describe('domainFromUrl', () => {
  it('strips the leading www.', () => {
    expect(domainFromUrl('https://www.voya.com/')).toBe('voya.com');
  });

  it('leaves a bare hostname alone', () => {
    expect(domainFromUrl('https://github.com/AardeYamz')).toBe('github.com');
  });

  it('falls back to the raw input for an unparseable URL', () => {
    expect(domainFromUrl('not a url')).toBe('not a url');
  });
});

describe('iconForUrl', () => {
  it('recognizes known social domains regardless of subdomain/www', () => {
    expect(iconForUrl('https://linkedin.com/in/yannis-lam/')).toBe('fab fa-linkedin-in');
    expect(iconForUrl('https://www.github.com/AardeYamz')).toBe('fab fa-github');
  });

  it('falls back to a generic external-link icon for unrecognized domains', () => {
    expect(iconForUrl('https://www.voya.com/')).toBe('fas fa-up-right-from-square');
    expect(iconForUrl('https://www.umass.edu/')).toBe('fas fa-up-right-from-square');
  });
});
