// Substitutes %VAR% placeholders in every built *.html file with values from
// process.env, so secrets/IDs configured in Vercel's dashboard never need to
// be committed to src/index.html. Runs as a postbuild step (see package.json).
//
// Fails closed on deployments: a Vercel build that can't resolve
// GOOGLE_ANALYTICS_ID exits non-zero instead of quietly shipping a default.
// There is deliberately no "real" fallback ID any more — the old one was this
// site's own measurement ID, so a fork or a project with the variable missing
// silently reported its visitors into someone else's analytics. Every other
// build (a local `npm run build`, this repo's CI compile check) still
// succeeds, substituting an inert placeholder that matches no property.
//
// Every route is prerendered (app.routes.server.ts), so the build writes one
// HTML file per route under DIST_DIR (index.html, index.csr.html,
// projects/index.html, projects/highschool/index.html, aardeyamz/index.html,
// ...) plus whatever the server output adds. All of them come from the same
// src/index.html template and carry the same %GOOGLE_ANALYTICS_ID%
// placeholder, so a direct load of any non-root route needs this walk to
// have GA actually wired up rather than shipping the literal placeholder.
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'v3.yannislam.org', 'browser');

// Vercel sets VERCEL=1 for every build it runs — preview and production
// alike. Both are real deployments served to the public, so an unresolvable
// analytics ID there is a configuration error worth stopping the build over,
// not something to paper over with a default.
const IS_DEPLOY_BUILD = process.env.VERCEL === '1';

// Deliberate opt-out for a deployment that wants no analytics at all
// (e.g. a fork). Without it, such a project could not be deployed: the build
// would fail every time for want of an env var it never intended to set.
const ALLOW_MISSING_ANALYTICS = process.env.ALLOW_MISSING_ANALYTICS === '1';

// Not a real GA4 property. gtag.js still loads and initialises, but against an
// ID that matches no property, so no hits are collected anywhere.
const GA_PLACEHOLDER = 'G-XXXXXXXXXX';

// name: the %PLACEHOLDER% in the HTML, env: process.env var to read,
// pattern: what a usable value must look like, hint: shown when it doesn't,
// placeholder: substituted when the env var is unset or invalid.
const REPLACEMENTS = [
  {
    name: 'GOOGLE_ANALYTICS_ID',
    env: 'GOOGLE_ANALYTICS_ID',
    pattern: /^G-[A-Z0-9]+$/,
    hint: 'a GA4 measurement ID looks like G-ABC123XYZ',
    placeholder: GA_PLACEHOLDER,
  },
];

// The Vercel project's variable is named GOOGLE_ANALYTICS (no _ID suffix), so
// accept it as an alias for GOOGLE_ANALYTICS_ID.
const ENV_ALIASES = { GOOGLE_ANALYTICS_ID: ['GOOGLE_ANALYTICS'] };

// Dashboard-pasted values often carry stray whitespace or quotes, which would
// silently break the gtag.js URL; trim them and reject anything that isn't a
// value the pattern accepts.
//
// Returns { value, problem } — problem is null when the env var supplied a
// usable value, or a short human-readable reason when it didn't, in which
// case `value` is the inert placeholder.
function resolveValue({ env, pattern, hint, placeholder }) {
  const names = [env, ...(ENV_ALIASES[env] || [])];
  const source = names.find((name) => process.env[name]);
  const raw = (process.env[source] || '').trim().replace(/^["']|["']$/g, '');

  if (!source || !raw) {
    return {
      value: placeholder,
      problem: `${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} not set`,
    };
  }
  if (!pattern.test(raw)) {
    return {
      value: placeholder,
      problem: `"${raw}" (from ${source}) is not a valid value — ${hint}`,
    };
  }
  return { value: raw, problem: null };
}

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[inject-env] Could not find build output at ${DIST_DIR}`);
    process.exit(1);
  }

  const htmlFiles = findHtmlFiles(DIST_DIR);
  if (htmlFiles.length === 0) {
    console.error(`[inject-env] No .html files found under ${DIST_DIR}`);
    process.exit(1);
  }

  // Resolve and validate everything before writing anything, so a build that
  // fails here never leaves a half-substituted dist/ directory behind.
  const resolved = REPLACEMENTS.map((replacement) => ({
    ...replacement,
    ...resolveValue(replacement),
  }));
  const unresolved = resolved.filter((replacement) => replacement.problem);

  if (unresolved.length > 0) {
    const fatal = IS_DEPLOY_BUILD && !ALLOW_MISSING_ANALYTICS;

    for (const { env, problem, placeholder } of unresolved) {
      if (fatal) {
        console.error(`[inject-env] ${env}: ${problem}`);
      } else {
        console.warn(
          `[inject-env] ${env}: ${problem}; substituting the inert placeholder ` +
            `"${placeholder}" — nothing will be reported to any analytics property.`,
        );
      }
    }

    if (fatal) {
      console.error(
        '[inject-env] Refusing to finish a deployment build without a usable ' +
          'analytics ID. Set it in the Vercel project (Settings → Environment ' +
          'Variables) and redeploy, or set ALLOW_MISSING_ANALYTICS=1 to deploy ' +
          'without analytics on purpose.',
      );
      process.exit(1);
    }
  }

  for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');
    for (const { name, value } of resolved) {
      html = html.split(`%${name}%`).join(value);
    }
    fs.writeFileSync(filePath, html);
  }

  console.log(`[inject-env] Injected environment values into ${htmlFiles.length} HTML file(s)`);
}

main();
