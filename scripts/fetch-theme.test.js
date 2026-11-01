const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureTheme, target, sha256, TOKENS } = require('./fetch-theme.js');

const TOKENS_BODY = Buffer.from(':root { --color-navy: #131f31; }\n');
const LOGO_BODY = Buffer.from('<svg viewBox="0 0 800 800"></svg>\n');
const BODIES = { [TOKENS]: TOKENS_BODY, 'logo-black.svg': LOGO_BODY };
const pin = (bodies = BODIES) => ({
  version: 'v2026-01-01-0000',
  files: Object.fromEntries(Object.entries(bodies).map(([name, body]) => [name, sha256(body)]))
});
// Answers each URL with the body registered for its file name.
const okFetch = (bodies = BODIES, calls = []) => async (url) => {
  calls.push(url);
  return { ok: true, status: 200, arrayBuffer: async () => bodies[url.split('/').pop()] };
};
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-theme-'));

test('fetches the pinned version and writes the tokens and the logos where the build expects them', async () => {
  const outDir = tmpDir();
  const calls = [];
  assert.deepEqual(await ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch(BODIES, calls) }), [TOKENS, 'logo-black.svg']);
  assert.deepEqual(fs.readFileSync(path.join(outDir, TOKENS)), TOKENS_BODY);
  assert.deepEqual(fs.readFileSync(path.join(outDir, 'logos', 'black.svg')), LOGO_BODY);
  assert.deepEqual(calls, [
    `https://theme.yannislam.org/v2026-01-01-0000/${TOKENS}`,
    'https://theme.yannislam.org/v2026-01-01-0000/logo-black.svg'
  ]);
});

test('leaves files that already match the pin, with no network', async () => {
  const outDir = tmpDir();
  await ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch() });
  const fetchImpl = async () => { throw new Error('should not fetch'); };
  assert.deepEqual(await ensureTheme({ pin: pin(), outDir, fetchImpl }), []);
});

test('fetches only the file that is missing', async () => {
  const outDir = tmpDir();
  await ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch() });
  fs.rmSync(path.join(outDir, 'logos', 'black.svg'));
  assert.deepEqual(await ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch() }), ['logo-black.svg']);
});

test('refuses a download whose hash differs from theme.json', async () => {
  const outDir = tmpDir();
  const tampered = { ...BODIES, 'logo-black.svg': Buffer.from('<svg>tampered</svg>') };
  await assert.rejects(ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch(tampered) }), /logo-black.svg .* does not match its hash/);
  assert.equal(fs.existsSync(path.join(outDir, 'logos', 'black.svg')), false);
});

test('replaces a stale file with the pinned one', async () => {
  const outDir = tmpDir();
  fs.mkdirSync(path.join(outDir, 'logos'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'logos', 'black.svg'), 'old');
  await ensureTheme({ pin: pin(), outDir, fetchImpl: okFetch() });
  assert.deepEqual(fs.readFileSync(path.join(outDir, 'logos', 'black.svg')), LOGO_BODY);
});

test('reports an HTTP error', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });
  await assert.rejects(ensureTheme({ pin: pin(), outDir: tmpDir(), fetchImpl }), /404/);
});

test('rejects a pinned file this repo does not use', () => {
  assert.throws(() => target('yl-theme.js', tmpDir()), /does not use/);
});
