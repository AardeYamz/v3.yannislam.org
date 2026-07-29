// Regenerates src/assets/resume-manifest.json with the newest-dated resume
// file in src/assets/resume/, so ResumeService never has to hardcode a
// filename that goes stale the next time the resume is updated.
//
// Runs as a pre-step before both `ng serve` and `ng build` (see
// package.json's pre* hooks), because ResumeService imports this file as a
// TS module at compile time — unlike scripts/inject-env.js, which only
// patches the built index.html *after* `ng build`, this has to exist
// *before* compilation starts so it also works under `ng serve`.
const fs = require('fs');
const path = require('path');

const RESUME_DIR = path.join(__dirname, '..', 'src', 'assets', 'resume');
const MANIFEST_PATH = path.join(__dirname, '..', 'src', 'assets', 'resume-manifest.json');

// Matches "<anything> YYYYMMDD.pdf", e.g. "Yannis Lam Resume 20260706.pdf".
const RESUME_FILENAME_PATTERN = /^.+ (\d{8})\.pdf$/i;

function resolveLatestResumeFilename() {
  if (!fs.existsSync(RESUME_DIR)) {
    console.warn(`[generate-resume-manifest] Resume directory not found at ${RESUME_DIR}`);
    return null;
  }

  const dated = fs.readdirSync(RESUME_DIR)
    .map((filename) => {
      const match = filename.match(RESUME_FILENAME_PATTERN);
      return match ? { filename, date: match[1] } : null;
    })
    .filter(Boolean);

  if (dated.length === 0) {
    console.warn(`[generate-resume-manifest] No files matching "<name> YYYYMMDD.pdf" found in ${RESUME_DIR}`);
    return null;
  }

  dated.sort((a, b) => b.date.localeCompare(a.date));
  return dated[0].filename;
}

const filename = resolveLatestResumeFilename();
fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ filename }) + '\n');
console.log(`[generate-resume-manifest] Wrote resume-manifest.json (filename: ${filename ?? 'none'})`);
