Date: 2026-11-22 02:50:00

# Drop deprecated @angular/animations

npm warned that `@angular/animations` is deprecated. The header, banner and footer entrance
animations now use `FadeStaggerDirective` (Web Animations API, same 250ms/50ms stagger and
easing), and the package and `provideAnimations()` are removed. No visible change.

Still warning, upstream: `rimraf@3`, `inflight` and `glob@7` come from Karma 6 (final release)
and `@lhci/cli`; `Unknown env config cache-dir` is set by Vercel's build environment.
