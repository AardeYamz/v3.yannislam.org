# Yannis Lam Portfolio Website v.3

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![DNS & Email by Cloudflare](https://img.shields.io/badge/DNS%20%26%20Email-Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Google Analytics](https://img.shields.io/badge/Analytics-Google%20Analytics-E37400?logo=googleanalytics&logoColor=white)](https://analytics.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 19, and later updated to version 22.
- Forked from [Lê Thanh Tuấn's Portfolio](https://github.com/lethanhtuan939/Portfolio)
- Which was based on [José Hernández's Portfolio](https://github.com/andresjosehr/andresjosehr-portfolio)
- And adapted from [Brittany Chiang's Portfolio](https://github.com/bchiang7/v4)

## Getting Started

### Prerequisites
You need to have npm and Angular CLI installed in your pc. Npm is available with NodeJS in [here](https://nodejs.org/). After you install npm, install Angular CLI with the following command in your terminal

``` bash
npm install -g @angular/cli
```

### Installing

Just clone  the repo and excecute the following command inside the folder project

``` bash
npm install
```

### All done!

Now just run
```
npm start
```
or
```
ng serve
```

Wait to compile and go to [http://localhost:4200](http://localhost:4200) after compile finish

### Development server

The application will automatically reload if you change any of the source files.

## Stack

**Framework & language**
- [Angular](https://angular.dev) 22 (`@angular/cli`, `@angular/core`, `@angular/router`, `@angular/animations`, `@angular/forms`) — `NgModule`-based app shell, with a few standalone components (`AardeYamzComponent`, `NamecardComponent`) lazy-loaded off the router
- TypeScript 6, strict mode + `strictTemplates`

**UI & content**
- [@ng-bootstrap/ng-bootstrap](https://ng-bootstrap.github.io/) 21 + [Bootstrap](https://getbootstrap.com/) 5 — layout, nav (`ngbNav`), dropdowns
- [@fortawesome/fontawesome-free](https://fontawesome.com/) 7 — iconography
- [ngx-typed-js](https://www.npmjs.com/package/ngx-typed-js) — the banner's typewriter effect
- [ngx-owl-carousel-o](https://www.npmjs.com/package/ngx-owl-carousel-o) — work history carousel
- [animejs](https://animejs.com) 4 — the boot-time loading screen's logo assembly animation (see `documentation/animejs-loading-screen.md`)
- AOS-style scroll reveal via a custom `AosDirective` (`src/app/directives/aos/`)
- All page copy (nav, banner, about, education, work history, contact, footer socials) is data-driven from `src/assets/config.json`, read through a single `SiteConfigService` (see `documentation/config-dedup-refactor.md`)

**Analytics**
- [ngx-google-analytics](https://www.npmjs.com/package/ngx-google-analytics) wrapping Google Analytics (gtag.js), routed through an `AnalyticsService` — see `documentation/google-analytics.md`

**Infrastructure & deployment**
- **Hosting/build**: [Vercel](https://vercel.com) builds and serves the production app (`vercel.json`); a `postbuild` step (`scripts/inject-env.js`) substitutes `%GOOGLE_ANALYTICS_ID%` in `index.html` from Vercel's environment at build time so the ID isn't hardcoded in source
- **DNS, CDN proxy & email**: [Cloudflare](https://www.cloudflare.com/) manages the `yannislam.org` zone — proxied `A`/`CNAME` records in front of Vercel, plus Cloudflare Email Routing (MX/SPF/DKIM/DMARC) for `@yannislam.org` mail
- Legacy/preview subdomains (`alpha.`, `v1.`, `v2.`) still resolve to Netlify via Cloudflare CNAMEs from earlier iterations of this site

## Architecture

```mermaid
flowchart TB
    subgraph Bootstrap
        Main["main.ts"] --> AppModule
        AppModule --> AppComponent
    end

    subgraph "AppComponent shell"
        AppComponent --> LoadingScreen["LoadingScreenComponent<br/>(anime.js logo intro)"]
        AppComponent --> Header["HeaderComponent<br/>(nav + theme toggle)"]
        AppComponent --> Outlet{{"router-outlet"}}
        AppComponent --> Footer["FooterComponent"]
    end

    Outlet -->|"path: ''"| Home["HomeComponent"]
    Outlet -->|"path: 'aardeyamz'<br/>loadComponent (lazy chunk)"| AardeYamz["AardeYamzComponent<br/>+ NamecardComponent"]

    subgraph "HomeModule (eager)"
        Home --> Banner["BannerComponent"]
        Home --> About["AboutComponent"]
        Home --> Education["EducationComponent"]
        Home --> WorkHistory["WorkHistoryComponent x2<br/>(work / volunteering)"]
        Home --> Contact["ContactComponent"]
    end

    Config[("src/assets/config.json")] --> SiteConfigService
    SiteConfigService --> Header
    SiteConfigService --> Footer
    SiteConfigService --> Banner
    SiteConfigService --> Home
    SiteConfigService --> Education
    SiteConfigService --> AardeYamz

    ThemeService["ThemeService<br/>(signals, localStorage)"] --> Header
    ThemeService --> LoadingScreen

    AnalyticsService --> Header
    AnalyticsService --> Banner
    AnalyticsService --> About
    AnalyticsService --> Footer
    AnalyticsService --> Contact
    AnalyticsService -->|"gtag events/pageviews"| GA[("Google Analytics")]
```

### Deployment & DNS

```mermaid
flowchart LR
    Dev["git push"] --> GitHub["GitHub repo"]
    GitHub -->|"build hook"| Vercel["Vercel<br/>ng build + postbuild inject-env.js"]

    Visitor["Visitor's browser"] -->|"DNS lookup"| Cloudflare["Cloudflare<br/>DNS zone: yannislam.org"]
    Cloudflare -->|"proxied A / CNAME"| Vercel
    Vercel -->|"static Angular bundle"| Visitor

    Cloudflare -->|"MX / SPF / DKIM / DMARC<br/>Email Routing"| Inbox["email@yannislam.org"]
    Cloudflare -.->|"legacy CNAMEs<br/>(alpha., v1., v2.)"| Netlify["Netlify<br/>(older site versions)"]
```
