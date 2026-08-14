// Data needed to render a hover-preview card: a FontAwesome icon class string
// (e.g. "fab fa-linkedin-in"), the label to show, and the page it links to.
export interface LinkPreviewData {
  icon: string;
  title: string;
  url: string;
}

// Only ever shown for real web pages - mailto:/tel:/etc. links have no
// "domain" to preview, so callers use this to skip them.
export function isPreviewableUrl(url: string | undefined | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Used only where the icon can't be passed in directly alongside the URL -
// see LinkPreviewDelegateDirective's doc comment for why (Angular's
// [innerHTML] sanitizer strips data-* attributes, so a link embedded in
// config.json's banner blurb can only carry standard attrs like `href`).
// Everywhere else (e.g. the footer's social icons), the real per-platform
// icon from config.json is used directly instead of this guesswork.
const ICON_BY_DOMAIN: Record<string, string> = {
  'linkedin.com': 'fab fa-linkedin-in',
  'github.com': 'fab fa-github',
  'tiktok.com': 'fab fa-tiktok',
  'facebook.com': 'fab fa-facebook-f',
  'fb.com': 'fab fa-facebook-f',
  'instagram.com': 'fab fa-instagram',
};
const DEFAULT_ICON = 'fas fa-up-right-from-square';

export function iconForUrl(url: string): string {
  const hostname = domainFromUrl(url);
  const domain = Object.keys(ICON_BY_DOMAIN).find(
    candidate => hostname === candidate || hostname.endsWith(`.${candidate}`)
  );
  return domain ? ICON_BY_DOMAIN[domain] : DEFAULT_ICON;
}
