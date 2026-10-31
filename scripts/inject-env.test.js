const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveValue, REPLACEMENTS, GA_PLACEHOLDER } = require('./inject-env.js');

const ga = REPLACEMENTS.find((r) => r.name === 'GOOGLE_ANALYTICS_ID');
const VARS = ['GOOGLE_ANALYTICS_ID', 'GOOGLE_ANALYTICS'];

function withEnv(env, fn) {
  const saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
  VARS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);
  try {
    return fn();
  } finally {
    VARS.forEach((k) => delete process.env[k]);
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  }
}

test('placeholder is inert, never a real-looking ID', () => {
  assert.equal(GA_PLACEHOLDER, 'G-XXXXXXXXXX');
});

test('unset variable falls back to the placeholder with a problem', () => {
  const r = withEnv({}, () => resolveValue(ga));
  assert.equal(r.value, GA_PLACEHOLDER);
  assert.match(r.problem, /not set/);
});

test('valid ID is used, trimmed and unquoted', () => {
  const r = withEnv({ GOOGLE_ANALYTICS_ID: ' "G-ABC123XYZ" ' }, () => resolveValue(ga));
  assert.deepEqual(r, { value: 'G-ABC123XYZ', problem: null });
});

test('the GOOGLE_ANALYTICS alias is accepted', () => {
  const r = withEnv({ GOOGLE_ANALYTICS: 'G-ABC123' }, () => resolveValue(ga));
  assert.equal(r.value, 'G-ABC123');
});

for (const bad of ['UA-12345-1', 'g-abc123', 'G-abc123', 'G-', 'G-AB C', 'G-ABC123"><script>']) {
  test(`malformed ID ${JSON.stringify(bad)} is rejected`, () => {
    const r = withEnv({ GOOGLE_ANALYTICS_ID: bad }, () => resolveValue(ga));
    assert.equal(r.value, GA_PLACEHOLDER);
    assert.match(r.problem, /not a valid value/);
  });
}
