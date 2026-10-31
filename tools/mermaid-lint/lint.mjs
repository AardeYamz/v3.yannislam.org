// Lints every ```mermaid block in the repo's tracked Markdown files with mermaid.parse.
// Usage (from anywhere in the repo):  node tools/mermaid-lint/lint.mjs [file.md ...]
// Exits 1 if any block fails to parse. Under GitHub Actions it also writes ::error annotations.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// mermaid needs a DOM even to parse; install one before importing it.
const dom = new JSDOM('<!DOCTYPE html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad: false });

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const args = process.argv.slice(2);
const files = args.length
  ? args
  : execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);

// A fence opens with ``` or ~~~ followed by "mermaid" and closes with the same character, at least as long.
function blocks(text) {
  const out = [];
  let open = null;
  text.split(/\r?\n/).forEach((line, i) => {
    if (!open) {
      const m = /^\s*(`{3,}|~{3,})\s*mermaid\b/.exec(line);
      if (m) open = { fence: m[1], start: i + 2, lines: [] };
    } else if (new RegExp(`^\s*${open.fence[0]}{${open.fence.length},}\s*$`).test(line)) {
      out.push({ start: open.start, code: open.lines.join('\n') });
      open = null;
    } else {
      open.lines.push(line);
    }
  });
  if (open) out.push({ start: open.start, code: open.lines.join('\n'), unclosed: true });
  return out;
}

let checked = 0;
let failed = 0;
for (const file of files) {
  const rel = path.relative(root, path.resolve(root, file)).split(path.sep).join('/');
  for (const b of blocks(readFileSync(path.resolve(root, file), 'utf8'))) {
    checked++;
    let message = null;
    if (b.unclosed) message = 'mermaid block is never closed';
    else {
      try { await mermaid.parse(b.code); } catch (e) { message = String(e?.message ?? e).split('\n').slice(0, 5).join('\n'); }
    }
    if (message === null) continue;
    failed++;
    const rel_line = /line (\d+)/.exec(message);
    const line = b.start + (rel_line ? Number(rel_line[1]) - 1 : 0);
    console.error(`${rel}:${line}: ${message}`);
    if (process.env.GITHUB_ACTIONS) console.error(`::error file=${rel},line=${line}::${message.split('\n')[0]}`);
  }
}
console.log(`${checked} mermaid block${checked === 1 ? '' : 's'} checked, ${failed} failed`);
process.exit(failed ? 1 : 0);
