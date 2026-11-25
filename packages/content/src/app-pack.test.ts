import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appPack } from './app-pack.ts';
import { answerLines, HELD_DOCS, isShown } from './rules.ts';
import type { Card, Site } from './types.ts';

const src = (publisher: string) => ({
  publisher,
  url: `https://example.org/${publisher}`,
  quote: 'q',
  kind: 'primary',
});
const card = (over: Partial<Card>): Card => ({
  id: 'x',
  era: 1,
  claim: 'A claim?',
  answer: 'An answer.',
  status: 'draft',
  heard: [
    { who: 'Someone', url: 'https://example.org/h', quote: 'They said it.' },
  ],
  facts: [{ text: 'F', enough: true, sources: [src('A'), src('B')] }],
  contested: ['plain', { text: 'with sources' }],
  not_claimed: [],
  ...over,
});
const site = (cards: Card[]): Site => ({
  chapters: [{ n: 1, title: 'Roots' }],
  cards,
  docs: {},
  standing: '',
});

test('only verified cards ship, unless it is a preview build', () => {
  const s = site([
    card({ id: 'v', status: 'verified', claim: 'One?' }),
    card({ id: 'd', claim: 'Two?' }),
  ]);
  assert.deepEqual(
    appPack(s).cards.map((c) => c.id),
    ['v'],
  );
  assert.deepEqual(
    appPack(s, { preview: true }).cards.map((c) => c.id),
    ['d', 'v'],
  );
  assert.equal(isShown(card({}), false), false);
});

test('one card per claim, the fuller one', () => {
  const thin = card({ id: 'a', status: 'verified' });
  const full = card({
    id: 'b',
    status: 'verified',
    facts: [...thin.facts, ...thin.facts],
  });
  assert.deepEqual(
    appPack(site([thin, full])).cards.map((c) => c.id),
    ['b'],
  );
});

test('a card carries its chapter, first heard quote, counts and no review notes', () => {
  const [c] = appPack(
    site([
      card({ status: 'verified', review: { skeptic: { notes: 'private' } } }),
    ]),
  ).cards;
  assert.equal(c.chapter, 'Roots');
  assert.equal(c.heard?.who, 'Someone');
  assert.equal(c.facts, 1);
  assert.equal(c.quotes, 2);
  assert.deepEqual(c.contested, ['plain', 'with sources']);
  assert.equal(JSON.stringify(c).includes('private'), false);
  const [none] = appPack(site([card({ status: 'verified', heard: [] })])).cards;
  assert.equal(none.heard, null);
  assert.equal(
    appPack(site([card({ status: 'verified', era: 9 })])).cards[0].chapter,
    'Chapter 9',
  );
});

test('answer lines carry only the sources the reviewer tied to them', () => {
  const c = card({
    answer_claims: [
      { says: 'One.', facts: [0] },
      { says: 'Two.', facts: [5] },
    ],
  });
  const lines = answerLines(c);
  assert.equal(lines[0].sources.length, 2);
  assert.deepEqual(lines[1].sources, []);
  assert.deepEqual(answerLines(card({})), [
    { says: 'An answer.', sources: [] },
  ]);
});

test('the election map stays held', () => {
  assert.equal(HELD_DOCS.has('election-map'), true);
});

test('updates list verified answers only, newest first, dated by their last review', () => {
  const s = site([
    card({
      id: 'old',
      claim: 'Old?',
      status: 'verified',
      review: {
        skeptic: { date: '2026-11-01' },
        citer: { date: '2026-11-03' },
      },
    }),
    card({
      id: 'new',
      claim: 'New?',
      status: 'verified',
      review: { skeptic: { date: '2026-11-20' } },
    }),
    card({ id: 'undated', claim: 'Undated?', status: 'verified' }),
    card({
      id: 'draft',
      claim: 'Draft?',
      review: { skeptic: { date: '2026-11-24' } },
    }),
  ]);
  const ids = (p: ReturnType<typeof appPack>) =>
    p.updates.map((u) => u.target.id);
  assert.deepEqual(ids(appPack(s)), ['new', 'old']);
  assert.equal(appPack(s).updates[1].date, '2026-11-03');
  // A preview build shows drafts as cards, but the feed still announces finished work only.
  assert.deepEqual(ids(appPack(s, { preview: true })), ['new', 'old']);
});
