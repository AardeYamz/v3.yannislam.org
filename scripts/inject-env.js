// Substitutes %VAR% placeholders in every built *.html file with values from
// process.env, so secrets/IDs configured in Vercel's dashboard never need to
// be committed to src/index.html. Runs as a postbuild step (see package.json).
//
// Every route is prerendered (app.routes.server.ts), so the build writes one
// HTML file per route under DIST_DIR (index.html, index.csr.html,
// projects/index.html, projects/highschool/index.html, aardeyamz/index.html,
// ...) plus whatever the server output adds. All of them come from the same
// src/index.html template and carry the same %GOOGLE_ANALYTICS_ID%
// placeholder, so a direct load of any non-root route needs this walk to
// have GA actually wired up rather than shipping the literal placeholder.
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'v3.yannislam.org', 'browser');

// name: the %PLACEHOLDER% in the HTML, env: process.env var to read, fallback: used when env is unset (e.g. local builds)
const REPLACEMENTS = [
  { name: 'GOOGLE_ANALYTICS_ID', env: 'GOOGLE_ANALYTICS_ID', fallback: 'G-E3T7KDSRKW' },
];

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

  for (const { name, env, fallback } of REPLACEMENTS) {
    const value = process.env[env];
    if (!value) {
      console.warn(`[inject-env] ${env} is not set, falling back to "${fallback}" for %${name}%`);
    }
  }

  for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');
    for (const { name, env, fallback } of REPLACEMENTS) {
      const value = process.env[env] || fallback;
      html = html.split(`%${name}%`).join(value);
    }
    fs.writeFileSync(filePath, html);
  }

  console.log(`[inject-env] Injected environment values into ${htmlFiles.length} HTML file(s)`);
}

main();
