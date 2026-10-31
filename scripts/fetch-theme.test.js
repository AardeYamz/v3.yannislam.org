const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureTokens, sha256, FILE } = require('./fetch-theme.js');

const BODY = Buffer.from(':root { --color-navy: #131f31; }\n');
const pinFor = (body) => ({ version: 'v2026-01-01-0000', files: { [FILE]: sha256(body) } });
const okFetch = (body, calls = []) => async (url) => {
  calls.push(url);
  return { ok: true, status: 200, arrayBuffer: async () => body };
};
const tmpOut = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-theme-')), 'generated', FILE);

test('fetches the pinned version and writes the file', async () => {
  const out = tmpOut();
  const calls = [];
  assert.equal(await ensureTokens({ pin: pinFor(BODY), out, fetchImpl: okFetch(BODY, calls) }), true);
  assert.deepEqual(fs.readFileSync(out), BODY);
  assert.equal(calls[0], `https://theme.yannislam.org/v2026-01-01-0000/${FILE}`);
});

test('leaves a file that already matches the pin, with no network', async () => {
  const out = tmpOut();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, BODY);
  const fetchImpl = async () => { throw new Error('should not fetch'); };
  assert.equal(await ensureTokens({ pin: pinFor(BODY), out, fetchImpl }), false);
});

test('refuses a download whose hash differs from theme.json', async () => {
  const out = tmpOut();
  await assert.rejects(
    ensureTokens({ pin: pinFor(BODY), out, fetchImpl: okFetch(Buffer.from('tampered')) }),
    /does not match its hash/
  );
  assert.equal(fs.existsSync(out), false);
});

test('replaces a stale file with the pinned one', async () => {
  const out = tmpOut();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, 'old');
  assert.equal(await ensureTokens({ pin: pinFor(BODY), out, fetchImpl: okFetch(BODY) }), true);
  assert.deepEqual(fs.readFileSync(out), BODY);
});

test('reports an HTTP error', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });
  await assert.rejects(ensureTokens({ pin: pinFor(BODY), out: tmpOut(), fetchImpl }), /404/);
});
