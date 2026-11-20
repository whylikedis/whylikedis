// The one check on the built site: the hosted fact page shows every verified card in full and no
// draft card at all beyond its claim, and it asks search engines to stay away. Run after `next build`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const { cards } = JSON.parse(read('./data/site.json'));
const html = read('./.next/server/app/facts.html');

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
assert.match(read('./.next/server/app/index.html'), /Where we stand/);
console.log(
  `site check: ${verified.length} verified cards in full, ${cards.length - verified.length} drafts by claim only`,
);
