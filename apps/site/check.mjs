// The one check on the built site: the hosted fact page shows every verified card in full and no
// draft card at all beyond its claim, and it asks search engines to stay away. Run after `next build`.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const { cards } = JSON.parse(read('data/site.json'));

// Where `next build` writes a prerendered page depends on the builder: a plain build writes
// .next/server/app/facts.html, and Vercel's build adapter may write it elsewhere under .next.
// Find each page by name rather than by one fixed path, and fail with what was found.
const built = readdirSync(join(here, '.next'), { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.html') && !f.startsWith(`cache${sep}`));
const page = (name) => {
  const hit = built.find(
    (f) =>
      f.endsWith(`app${sep}${name}.html`) ||
      f.endsWith(`app${sep}${name}${sep}index.html`),
  );
  assert.ok(
    hit,
    `no built ${name} page under .next; html files found: ${built.join(', ') || 'none'}`,
  );
  return read(join('.next', hit));
};
const html = page('facts');

// A card shown in full carries its id in a <code> tag; a draft is listed by its claim only.
const shown = (c) => html.includes(`<code>${c.id}</code>`);
const verified = cards.filter((c) => c.status === 'verified');
assert.ok(
  verified.length > 0,
  'no verified card: the check would prove nothing',
);
for (const c of cards) {
  assert.equal(
    shown(c),
    c.status === 'verified',
    `${c.id} (${c.status}) is ${shown(c) ? '' : 'not '}shown in full`,
  );
}
assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
assert.match(page('index'), /Where we stand/);
console.log(
  `site check: ${verified.length} verified cards in full, ${cards.length - verified.length} drafts by claim only`,
);
