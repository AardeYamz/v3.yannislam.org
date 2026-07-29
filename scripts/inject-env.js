// Substitutes %VAR% placeholders in the built index.html with values from
// process.env, so secrets/IDs configured in Vercel's dashboard never need to
// be committed to src/index.html. Runs as a postbuild step (see package.json).
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'v3.yannislam.org', 'browser');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// name: the %PLACEHOLDER% in index.html, env: process.env var to read, fallback: used when env is unset (e.g. local builds)
const REPLACEMENTS = [
  { name: 'GOOGLE_ANALYTICS_ID', env: 'GOOGLE_ANALYTICS_ID', fallback: 'G-E3T7KDSRKW' },
];

function main() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error(`[inject-env] Could not find built index.html at ${INDEX_HTML_PATH}`);
    process.exit(1);
  }

  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  for (const { name, env, fallback } of REPLACEMENTS) {
    const value = process.env[env];
    if (!value) {
      console.warn(`[inject-env] ${env} is not set, falling back to "${fallback}" for %${name}%`);
    }
    html = html.split(`%${name}%`).join(value || fallback);
  }

  fs.writeFileSync(INDEX_HTML_PATH, html);
  console.log('[inject-env] Injected environment values into index.html');
}

main();
