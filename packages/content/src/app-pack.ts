import {
  answerLines,
  chapterTitle,
  contestedText,
  isShown,
  quoteCount,
} from './rules.ts';
import type { Site } from './types.ts';

// What the app bundles: the shown cards, trimmed to what a phone screen and a game use, so the app
// works offline and starts without a network call. The gate's review notes never ship.
export type PackSource = { publisher: string; url: string; quote: string };
export type PackCard = {
  id: string;
  chapter: string;
  claim: string;
  heard: { who?: string; quote: string; url: string } | null;
  lines: { says: string; sources: PackSource[] }[];
  contested: string[];
  verified: boolean;
  approved: boolean;
  facts: number;
  quotes: number;
};
export type AppPack = { version: 1; preview: boolean; cards: PackCard[] };

const source = (s: {
  publisher: string;
  url: string;
  quote: string;
}): PackSource => ({
  publisher: s.publisher,
  url: s.url,
  quote: s.quote,
});

export function appPack(site: Site, { preview = false } = {}): AppPack {
  const seen = new Set<string>();
  const cards = site.cards
    .filter((c) => isShown(c, preview))
    // One card per claim: the fuller one when two share a claim, as the site's search does.
    .sort((a, b) => b.facts.length - a.facts.length)
    .filter((c) => (seen.has(c.claim) ? false : (seen.add(c.claim), true)))
    .sort((a, b) => a.era - b.era || a.id.localeCompare(b.id))
    .map((c): PackCard => ({
      id: c.id,
      chapter: chapterTitle(site.chapters, c.era),
      claim: c.claim,
      heard: c.heard[0]
        ? { who: c.heard[0].who, quote: c.heard[0].quote, url: c.heard[0].url }
        : null,
      lines: answerLines(c).map((l) => ({
        says: l.says,
        sources: l.sources.map(source),
      })),
      contested: contestedText(c),
      verified: c.status === 'verified',
      approved: Boolean(c.content_approved),
      facts: c.facts.length,
      quotes: quoteCount(c),
    }));
  return { version: 1, preview, cards };
}
