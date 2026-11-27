const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FILTER = path.join(__dirname, '..', '.github', 'pr-previews', 'prs.jq');
const hasJq = spawnSync('jq', ['--version']).status === 0;

// Pull request as `gh pr list --json number,title,author,headRefName,isDraft,updatedAt,url` prints it.
const pr = (number, extra = {}) => ({
  number,
  title: `Title ${number}`,
  author: { login: 'octocat', is_bot: false },
  headRefName: `feat/pr-${number}`,
  isDraft: false,
  updatedAt: '2026-11-24T10:00:00Z',
  url: `https://github.com/o/r/pull/${number}`,
  ...extra
});

// Runs the real filter the way pr-previews-deploy.yml does and returns the parsed prs.json.
function rows(open, previews) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-previews-'));
  const openFile = path.join(dir, 'open.json');
  fs.writeFileSync(openFile, JSON.stringify(open));
  const res = spawnSync('jq', ['-Rn', '--slurpfile', 'open', openFile, '-f', FILTER], { input: previews, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}

test('joins a staged preview with its open PR into one row', { skip: !hasJq && 'jq not installed' }, () => {
  assert.deepEqual(rows([pr(12)], '12 abc1234\n'), [{
    number: 12,
    title: 'Title 12',
    author: 'octocat',
    branch: 'feat/pr-12',
    draft: false,
    sha: 'abc1234',
    updated: '2026-11-24T10:00:00Z',
    url: 'https://github.com/o/r/pull/12'
  }]);
});

test('drops a staged preview whose PR is no longer open', { skip: !hasJq && 'jq not installed' }, () => {
  assert.deepEqual(rows([pr(12)], '7 deadbee\n12 abc1234\n').map(r => r.number), [12]);
});

test('drops an open PR that has no staged preview', { skip: !hasJq && 'jq not installed' }, () => {
  assert.deepEqual(rows([pr(12), pr(13)], '13 abc1234\n').map(r => r.number), [13]);
});

test('carries the draft flag and the staged commit of each PR', { skip: !hasJq && 'jq not installed' }, () => {
  const out = rows([pr(1, { isDraft: true }), pr(2)], '1 aaaaaaa\n2 bbbbbbb\n');
  assert.deepEqual(out.map(r => [r.number, r.draft, r.sha]), [[1, true, 'aaaaaaa'], [2, false, 'bbbbbbb']]);
});

test('writes an empty list when nothing is staged or nothing is open', { skip: !hasJq && 'jq not installed' }, () => {
  assert.deepEqual(rows([pr(12)], ''), []);
  assert.deepEqual(rows([], '12 abc1234\n'), []);
});
