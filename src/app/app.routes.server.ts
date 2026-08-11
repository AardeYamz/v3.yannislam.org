import { RenderMode, ServerRoute } from '@angular/ssr';

// This site is a fully static, config-driven SPA (see src/assets/config.json) with
// no backend and no per-request data, so every known route is explicitly listed here
// for build-time static prerendering rather than being served by a live SSR server.
// Keep this list in sync with src/app/app-routing.module.ts.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'projects', renderMode: RenderMode.Prerender },
  { path: 'projects/highschool', renderMode: RenderMode.Prerender },
  { path: 'aardeyamz', renderMode: RenderMode.Prerender },
  // Safety net for any route not explicitly listed above (e.g. the client-side
  // '**' redirect-to-'/' route) - still resolved to static HTML at build time.
  { path: '**', renderMode: RenderMode.Prerender },
];
