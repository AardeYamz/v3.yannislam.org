import { test, expect } from './fixtures';
import config from '../src/assets/config.json';

// Request-level only: no page, no boot sequence. This is the cheapest check
// in the suite and it catches the most common content-editing mistake in
// this repo — adding an entry to config.json whose image was never committed.

// Work/volunteering entries carry a `logoKey` instead of their own `imgs`,
// so the property is genuinely absent on some of these shapes.
const imagesIn = (list: readonly object[]): string[] =>
  list.flatMap((entry) => ('imgs' in entry ? (entry as { imgs: string[] }).imgs : []));

const referencedImages = new Set<string>([
  ...Object.values(config.logos).map((logo) => logo.src),
  ...imagesIn(config.about.experiences.work.list),
  ...imagesIn(config.about.experiences.volunteering.list),
  ...imagesIn(config.projects.college.list),
  ...imagesIn(config.projects.highschool.list),
]);

// Hotlinked third-party org logos are deliberate — LogoFallbackDirective
// exists to render a generated SVG when one of them 404s, so their
// availability is not this repo's regression surface. `data:` URIs
// (config.json uses `data:,` to force that fallback) never hit the network.
const localImages = [...referencedImages].filter((src) => !/^(https?:|data:)/.test(src));

// The header swaps between these three by theme (ThemeService.logoVariant).
const logoVariants = ['clearcolor', 'black', 'white'];

const staticFiles = [
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/favicon.ico',
];

test.describe('assets', () => {
  test(`every locally-referenced config image resolves (${localImages.length})`, async ({ request }) => {
    const missing: string[] = [];

    for (const src of localImages) {
      const response = await request.get(`/${src.replace(/^\//, '')}`);
      if (!response.ok()) missing.push(`${src} -> ${response.status()}`);
    }

    expect(missing, 'config.json references images that are not in the build').toEqual([]);
  });

  for (const variant of logoVariants) {
    test(`the ${variant} header logo resolves`, async ({ request }) => {
      const response = await request.get(`/assets/images/logos/${variant}.svg`);
      expect(response.status()).toBe(200);
    });
  }

  for (const file of staticFiles) {
    test(`${file} is served`, async ({ request }) => {
      const response = await request.get(file);
      expect(response.status()).toBe(200);
    });
  }

  test('every route in sitemap.xml is reachable', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => new URL(match[1]).pathname);

    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), `${path} from sitemap.xml`).toBe(200);
    }
  });

  test('sitemap.xml covers every route the router defines', async ({ request }) => {
    // Nothing generates sitemap.xml — docs/changes/…-seo-fixes.md notes it
    // needs a manual update whenever app-routing.module.ts gains a route.
    // This is the check that notices when that didn't happen.
    const sitemap = await (await request.get('/sitemap.xml')).text();

    for (const path of ['/', '/projects', '/projects/highschool', '/aardeyamz']) {
      expect(sitemap).toContain(`<loc>https://yannislam.org${path}</loc>`);
    }
  });
});
