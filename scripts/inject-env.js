// Substitutes %VAR% placeholders in the built index.html with values from
// process.env, so secrets/IDs configured in Vercel's dashboard never need to
// be committed to src/index.html. Runs as a postbuild step (see package.json).
//
// Also resolves %RESUME_FILENAME% by scanning the built assets/resume/
// directory for the newest-dated file, so header.component.ts never has to
// hardcode a filename that goes stale the next time the resume is updated.
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'v3.yannislam.org', 'browser');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const RESUME_DIR = path.join(DIST_DIR, 'assets', 'resume');

// Matches "<anything> YYYYMMDD.pdf", e.g. "Yannis Lam Resume 20260706.pdf".
const RESUME_FILENAME_PATTERN = /^.+ (\d{8})\.pdf$/i;

// name: the %PLACEHOLDER% in index.html, env: process.env var to read, fallback: used when env is unset (e.g. local builds)
const REPLACEMENTS = [
  { name: 'GOOGLE_ANALYTICS_ID', env: 'GOOGLE_ANALYTICS_ID', fallback: 'G-E3T7KDSRKW' },
];

function resolveLatestResumeFilename() {
  if (!fs.existsSync(RESUME_DIR)) {
    console.warn(`[inject-env] Resume directory not found at ${RESUME_DIR}, leaving %RESUME_FILENAME% unresolved`);
    return '';
  }

  const dated = fs.readdirSync(RESUME_DIR)
    .map((filename) => {
      const match = filename.match(RESUME_FILENAME_PATTERN);
      return match ? { filename, date: match[1] } : null;
    })
    .filter(Boolean);

  if (dated.length === 0) {
    console.warn(`[inject-env] No files matching "<name> YYYYMMDD.pdf" found in ${RESUME_DIR}`);
    return '';
  }

  dated.sort((a, b) => b.date.localeCompare(a.date));
  return dated[0].filename;
}

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

  const resumeFilename = resolveLatestResumeFilename();
  if (resumeFilename) {
    console.log(`[inject-env] Resolved latest resume file: "${resumeFilename}"`);
  }
  html = html.split('%RESUME_FILENAME%').join(resumeFilename);

  fs.writeFileSync(INDEX_HTML_PATH, html);
  console.log('[inject-env] Injected environment values into index.html');
}

main();
