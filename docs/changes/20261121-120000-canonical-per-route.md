# Canonical URL and og:url per route

Date: 2026-11-21 12:00:00

`index.html` is shared by every prerendered route, so `/projects`,
`/projects/highschool` and `/aardeyamz` all declared `https://yannislam.org`
as canonical and `og:url`, telling search engines the sub-pages duplicate the
home page (audit finding M-1, #197).

`SeoService` (started from `AppComponent`) now updates the existing
`link[rel=canonical]`, `og:url` and `twitter:url` values on every
`NavigationEnd`, including during prerender. The root keeps the bare origin.
Translation editions will also need `hreflang`; that is left to those PRs.
