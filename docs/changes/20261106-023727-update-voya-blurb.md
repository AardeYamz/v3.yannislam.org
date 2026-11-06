Date: 2026-11-06 02:37:27

# Update The Voya Blurb

The "about" blurb on the three Voya work entries (Software Developer, Associate Software Developer, Intern) in
`src/assets/config.json` is rewritten from https://www.voya.com/about-us/our-company. It replaces the old figures
(15.2 million clients, Ethisphere and Bloomberg recognition) with the current description: a retirement, employee
benefits and investment management company with more than 18 million customer relationships, about 11,000 employees,
$1.19 trillion in assets under management and administration, a top 5 retirement plan provider and a top 3 group
supplemental health insurance provider.

The blurb was repeated verbatim on all three Voya entries, so it now lives once in a new top-level `logoAbout` map in
`config.json`, keyed by `logoKey`. `SiteConfigService.resolveLogoKeys` fills an entry's `about` from it when the entry
has none of its own (an entry's own `about` still wins). Components are unchanged.
