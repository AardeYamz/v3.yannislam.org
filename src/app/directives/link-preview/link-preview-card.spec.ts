import { blocksFraming, domainFromUrl, iconForUrl, isPreviewableUrl } from './link-preview-card';

describe('isPreviewableUrl', () => {
    it('accepts http(s) URLs', () => {
        expect(isPreviewableUrl('https://example.com')).toBe(true);
        expect(isPreviewableUrl('http://example.com')).toBe(true);
    });

    it('rejects non-web schemes and empty values', () => {
        expect(isPreviewableUrl('mailto:test@example.com')).toBe(false);
        expect(isPreviewableUrl('')).toBe(false);
        expect(isPreviewableUrl(undefined)).toBe(false);
        expect(isPreviewableUrl(null)).toBe(false);
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
        expect(iconForUrl('https://linkedin.com/in/yannis-lam/')).toBe('fa-linkedin-in');
        expect(iconForUrl('https://www.github.com/AardeYamz')).toBe('fa-github');
    });

    it('falls back to a generic external-link icon for unrecognized domains', () => {
        expect(iconForUrl('https://www.voya.com/')).toBe('fa-up-right-from-square');
        expect(iconForUrl('https://www.umass.edu/')).toBe('fa-up-right-from-square');
    });
});

describe('blocksFraming', () => {
    it('recognizes the known social domains regardless of subdomain/www', () => {
        expect(blocksFraming('https://linkedin.com/in/yannis-lam/')).toBe(true);
        expect(blocksFraming('https://www.github.com/AardeYamz')).toBe(true);
        expect(blocksFraming('https://m.facebook.com/AardeYamz')).toBe(true);
    });

    it('returns false for domains with no known framing restriction', () => {
        expect(blocksFraming('https://www.voya.com/')).toBe(false);
        expect(blocksFraming('https://www.umass.edu/')).toBe(false);
    });
});
