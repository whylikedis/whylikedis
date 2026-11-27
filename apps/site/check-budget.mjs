// A size budget for what a reader downloads before a page works: the gzipped JavaScript and CSS the
// built page's HTML asks for (script tags and preloads, not chunks loaded later on a press or after
// the page is up). Budgets sit at the measured level (budget.json), so a page can only get lighter:
// a change that adds weight fails here and says by how much. Lowering a budget needs nothing;
// raising one is a decision a reviewer sees in the diff.
//
// Usage: node check-budget.mjs [--print]   (after `npm run build`; --print shows the numbers)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SITE = dirname(fileURLToPath(import.meta.url));
const NEXT = join(SITE, '.next');
const budgets = JSON.parse(readFileSync(join(SITE, 'budget.json'), 'utf8'));

const gz = (file) => gzipSync(readFileSync(join(NEXT, file))).length;

/** Gzipped bytes of the scripts and styles one built page loads up front. */
export function weigh(page) {
  const html = readFileSync(
    join(NEXT, 'server/app', page === '/' ? 'index.html' : `${page}.html`),
    'utf8',
  );
  const files = (re) =>
    [...new Set([...html.matchAll(re)].map((m) => m[1]))].map((u) =>
      u
        .replace(/^\/_next\//, 'static/')
        .replace(/^static\/static\//, 'static/'),
    );
  const js = files(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g);
  const css = files(/href="(\/_next\/static\/[^"]+\.css)"/g);
  return {
    js: js.reduce((n, f) => n + gz(f), 0),
    css: css.reduce((n, f) => n + gz(f), 0),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const print = process.argv.includes('--print');
  let failed = false;
  for (const [page, limit] of Object.entries(budgets.pages)) {
    const got = weigh(page);
    for (const kind of ['js', 'css']) {
      const over = got[kind] - limit[kind];
      const line = `${page.padEnd(30)} ${kind.padEnd(3)} ${got[kind]} B (budget ${limit[kind]})`;
      if (print) console.log(line);
      if (over > 0) {
        failed = true;
        console.error(`over budget by ${over} B: ${line}`);
      }
    }
  }
  if (failed) {
    console.error(
      '\nA page got heavier. Make it lighter, or say in the PR why it must grow and raise budget.json.',
    );
    process.exit(1);
  }
  if (!print) console.log('size budget: every page within its budget');
}
