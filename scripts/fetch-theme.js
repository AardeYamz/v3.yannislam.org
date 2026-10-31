// Fetches the shared design tokens (yl-tokens.css) from the yl-theme project at the version pinned in theme.json,
// checks their SHA-256, and writes src/generated/yl-tokens.css (git-ignored), which angular.json loads in place of
// the old src/theme.scss. A changed or corrupted file fails the build instead of shipping.
//
//   node scripts/fetch-theme.js          fetch if missing or wrong (the pre* hooks in package.json run this)
//   node scripts/fetch-theme.js --bump   pin the newest published version and rewrite theme.json
//
// The files are fetched from theme.yannislam.org (the yl-theme Vercel project), not from this site's own /theme path,
// so building does not depend on the site being built. The fonts are licensed and not published; they stay in
// src/assets and src/fonts.scss.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://theme.yannislam.org';
const PIN = path.join(ROOT, 'theme.json');
const OUT = path.join(ROOT, 'src', 'generated', 'yl-tokens.css');
const FILE = 'yl-tokens.css';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function get(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Writes OUT when it is missing or does not match the pinned hash. Returns true if it fetched.
async function ensureTokens({ pin = JSON.parse(fs.readFileSync(PIN, 'utf8')), out = OUT, fetchImpl = fetch } = {}) {
  const want = pin.files[FILE];
  if (fs.existsSync(out) && sha256(fs.readFileSync(out)) === want) return false;
  const data = await get(`${BASE}/${pin.version}/${FILE}`, fetchImpl);
  if (sha256(data) !== want) {
    throw new Error(`${FILE} at ${pin.version} does not match its hash in theme.json; refusing to use it`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  return true;
}

async function bump() {
  const versions = JSON.parse((await get(`${BASE}/versions.json`, fetch)).toString());
  const latest = Object.keys(versions).sort().pop(); // v + UTC timestamp sorts as text
  fs.writeFileSync(PIN, JSON.stringify({ version: latest, files: { [FILE]: versions[latest][FILE] } }, null, 2) + '\n');
  console.log(`[fetch-theme] pinned ${latest}`);
}

async function main() {
  if (process.argv.includes('--bump')) return bump();
  const pin = JSON.parse(fs.readFileSync(PIN, 'utf8'));
  const fetched = await ensureTokens({ pin });
  console.log(`[fetch-theme] ${FILE} ${pin.version}${fetched ? ' fetched' : ' already in src/generated'}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(`[fetch-theme] ${e.message}`); process.exit(1); });
}

module.exports = { ensureTokens, sha256, FILE };
