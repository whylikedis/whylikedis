import type { Card, Chapter, Source } from './types.ts';

// Docs written but held back until the owners approve them. A held doc gets no page, no share image,
// no link, and no place in the app: the election pages wait for the owners to agree on them.
export const HELD_DOCS: ReadonlySet<string> = new Set(['election-map']);

// A card is shown in full only once it is verified. `preview` is the local preview of the site, or a
// preview build of the app, where drafts show too, labelled as still being checked.
export const isShown = (c: Card, preview = false) =>
  preview || c.status === 'verified';

export const quoteCount = (c: Card) =>
  c.facts.reduce((n, f) => n + f.sources.length, 0);

export const contestedText = (c: Card) =>
  c.contested.map((x) => (typeof x === 'string' ? x : x.text));

export const chapterTitle = (chapters: Chapter[], era: number) =>
  chapters.find((ch) => ch.n === era)?.title ?? `Chapter ${era}`;

export type AnswerLine = { says: string; sources: Source[] };

// The answer, one sentence per line, each with the sources of the facts the reviewer tied it to.
// A card without that mapping is one line with no sources, rather than sources it cannot back.
export const answerLines = (c: Card): AnswerLine[] => {
  const claims = c.answer_claims?.length
    ? c.answer_claims
    : [{ says: c.answer, facts: [] }];
  return claims.map((a) => ({
    says: a.says,
    sources: a.facts
      .map((i) => c.facts[i])
      .filter(Boolean)
      .flatMap((f) => f.sources),
  }));
};
