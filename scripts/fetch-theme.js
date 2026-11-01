// Fetches the shared design tokens (yl-tokens.css), the logos (logo-<variant>.svg) and the logo geometry from the yl-theme project at the
// version pinned in theme.json, checks each file's SHA-256, and writes them under src/generated/ (git-ignored):
//
//   yl-tokens.css       -> src/generated/yl-tokens.css       loaded by angular.json in place of the old src/theme.scss
//   logo-<variant>.svg  -> src/generated/logos/<variant>.svg  served at assets/images/logos/<variant>.svg (angular.json)
//   logo-geometry.json  -> src/generated/logo-geometry.json   the mark's polygons, which the loading screens draw from
//
// A changed or corrupted file fails the build instead of shipping.
//
//   node scripts/fetch-theme.js          fetch what is missing or wrong (the pre* hooks in package.json run this)
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
const OUT_DIR = path.join(ROOT, 'src', 'generated');
const TOKENS = 'yl-tokens.css';
const GEOMETRY = 'logo-geometry.json';
const LOGO = /^logo-([\w-]+)\.svg$/;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// Where a published file lands under the output folder: the tokens at the top, logo-<variant>.svg as logos/<variant>.svg.
function target(name, outDir = OUT_DIR) {
  const logo = LOGO.exec(name);
  if (logo) return path.join(outDir, 'logos', `${logo[1]}.svg`);
  if (name === TOKENS || name === GEOMETRY) return path.join(outDir, name);
  throw new Error(`theme.json lists ${name}, which this repo does not use`);
}

async function get(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Writes every file in the pin that is missing or does not match its pinned hash. Returns the names it fetched.
async function ensureTheme({ pin = JSON.parse(fs.readFileSync(PIN, 'utf8')), outDir = OUT_DIR, fetchImpl = fetch } = {}) {
  const fetched = [];
  for (const [name, want] of Object.entries(pin.files)) {
    const out = target(name, outDir);
    if (fs.existsSync(out) && sha256(fs.readFileSync(out)) === want) continue;
    const data = await get(`${BASE}/${pin.version}/${name}`, fetchImpl);
    if (sha256(data) !== want) {
      throw new Error(`${name} at ${pin.version} does not match its hash in theme.json; refusing to use it`);
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, data);
    fetched.push(name);
  }
  return fetched;
}

async function bump() {
  const versions = JSON.parse((await get(`${BASE}/versions.json`, fetch)).toString());
  const latest = Object.keys(versions).sort().pop(); // v + UTC timestamp sorts as text
  const files = Object.fromEntries(
    Object.entries(versions[latest]).filter(([name]) => name === TOKENS || name === GEOMETRY || LOGO.test(name)).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.writeFileSync(PIN, JSON.stringify({ version: latest, files }, null, 2) + '\n');
  console.log(`[fetch-theme] pinned ${latest}`);
}

async function main() {
  if (process.argv.includes('--bump')) return bump();
  const pin = JSON.parse(fs.readFileSync(PIN, 'utf8'));
  const fetched = await ensureTheme({ pin });
  console.log(`[fetch-theme] ${pin.version}: ${fetched.length ? `fetched ${fetched.length} file(s)` : 'already in src/generated'}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(`[fetch-theme] ${e.message}`); process.exit(1); });
}

module.exports = { ensureTheme, target, sha256, TOKENS, GEOMETRY };
