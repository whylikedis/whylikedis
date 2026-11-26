import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HELD_DOCS, type Site } from '@whylikedis/content';

// data/site.json is written by export.py from facts/ and docs/. The gate decides; the site displays.
// The types and the rules for what is shown live in @whylikedis/content, shared with the app.
export type { Card, Fact, Round, Source } from '@whylikedis/content';

const raw: Site = JSON.parse(
  readFileSync(path.join(process.cwd(), 'data', 'site.json'), 'utf8'),
);
// A claim sits inside curly double quotes on every page, so a straight ' inside it ("'From the
// river to the sea' is…") showed as a typewriter mark beside a typeset one. Our own words (the
// claim, the answer and its lines, what is argued, what we don't say) are set with curly marks;
// a source's quote stays exactly as it was copied.
export const curly = (s: string) =>
  s.replace(/(^|[\s(\[“—-])'/g, '$1‘').replace(/'/g, '’');

export const site: Site = {
  ...raw,
  cards: raw.cards.map((c) => ({
    ...c,
    claim: curly(c.claim),
    answer: curly(c.answer),
    answer_claims: c.answer_claims?.map((a) => ({ ...a, says: curly(a.says) })),
    contested: c.contested.map((x) =>
      typeof x === 'string' ? curly(x) : { ...x, text: curly(x.text) },
    ),
    not_claimed: c.not_claimed.map(curly),
  })),
  docs: Object.fromEntries(
    Object.entries(raw.docs).filter(([doc]) => !HELD_DOCS.has(doc)),
  ),
};

// The hosted site shows a card in full only once it is verified. SITE_PREVIEW=1 is the local preview.
export const PREVIEW = process.env.SITE_PREVIEW === '1';

export const counts = () => {
  const facts = site.cards.flatMap((c) => c.facts);
  return {
    cards: site.cards.length,
    verified: site.cards.filter((c) => c.status === 'verified').length,
    sourced: facts.filter((f) => f.enough).length,
    facts: facts.length,
    quotes: facts.reduce((sum, f) => sum + f.sources.length, 0),
    approved: site.cards.filter((c) => c.content_approved).length,
  };
};
