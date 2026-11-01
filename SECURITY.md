# Security policy

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository ([direct link](https://github.com/AardeYamz/v3.yannislam.org/security/advisories/new)). Include what you found, how to reproduce it, and what it affects. Expect a first reply within a week.

## Scope

- The site at https://yannislam.org, which is static and prerendered: XSS, content injection, a weak `Content-Security-Policy` or other headers set in `vercel.json`, and anything that leaks data.
- The build and CI pipeline in `.github/workflows/` and `scripts/`.
- Dependencies: Dependabot and the `Security` workflow track these; a report is only needed if you find something they don't.

Out of scope: denial-of-service or load testing, social engineering, and findings in third-party services (Vercel, Cloudflare, Google Analytics) that I can't fix myself.

## Supported versions

Only the latest build on `main`, which is what is deployed.
