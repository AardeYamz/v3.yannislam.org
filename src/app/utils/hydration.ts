// Whether the current page's initial HTML came from @angular/ssr's static
// prerendering (build-time SSG) and the client is now hydrating it, as
// opposed to a cold client-only bootstrap (e.g. `ng serve`, which has no
// server-rendered markup to reuse).
//
// This matters because prerendered HTML already shows the "settled"
// end-state of boot-time UI - the loading screen already hidden, the header
// already mounted (see LoadingScreenComponent / AppComponent.headerReady,
// both of which resolve synchronously during server rendering since there's
// no animation to wait on there). A client bootstrap that doesn't know this
// happened starts those same fields back at their pre-animation defaults,
// which don't match what the server rendered - Angular's hydration then has
// to reconcile that mismatch, and the visible result is the finished page
// flashing (from the static HTML) before the loading screen pops back up
// and replays its ~2s intro/outro from scratch.
//
// `ng-server-context` is a static attribute @angular/ssr's server renderer
// writes onto <app-root> purely as metadata - unlike the `ngh` markers
// Angular's hydration runtime consumes and strips as it walks the tree,
// this one isn't part of that bookkeeping, so it's safe to read at any
// point during client bootstrap (including a component's constructor,
// before its own view exists).
export function wasServerPrerendered(): boolean {
  return typeof document !== 'undefined'
    && document.querySelector('app-root')?.hasAttribute('ng-server-context') === true;
}
