Date: 2026-11-22 22:53:08

# Short README with a reference doc

The README is now an overview: what the site is, two diagrams, a table of related repos and the commands to start. The previous full README (stack, routes, code structure, build hooks, testing, CI/CD, DNS, dependency security) moved unchanged to [docs/reference.md](../reference.md), with its relative links adjusted. `CLAUDE.md` now points to the reference for those details.

## Fixed: related repos and small inaccuracies

Checked against the code: the related-repos table dropped `workflows` (nothing in this repo calls it yet; the mermaid-lint workflow is still in PR #166) and `v3.yannislam.org-gatsby` (no such repo), and now says the remaining three are private. The README also gains a "where it lives" line of file paths, `npm run test:scripts`, the Release step in the CI diagram, and "Cloudflare DNS" in place of "DNS + Email" on the visitor path. In `docs/reference.md` the Playwright badge now matches the installed 1.65.
