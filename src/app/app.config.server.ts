import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';

// Deliberately its own minimal provider set rather than merging the full
// client appConfig: the previous NgModule-based AppServerModule only ever
// had `provideServerRendering` (imports: [] -- no BrowserAnimationsModule,
// ServiceWorkerModule, or provideClientHydration server-side), and mixing
// those browser-only providers into the server bootstrap breaks route
// extraction (NG0401) during prerendering. Only the router needs
// duplicating here since <router-outlet> has to resolve a component per
// URL during prerendering same as it does client-side.
const serverConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};

export const config = serverConfig;
