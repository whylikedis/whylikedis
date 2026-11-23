import { readFileSync } from 'node:fs';
import path from 'node:path';

// data/site.json is written by export.py from facts/ and docs/. The gate decides; the site displays.
export type Source = {
  publisher: string;
  url: string;
  quote: string;
  kind: string;
  wire?: string;
};
export type Fact = {
  text: string;
  record?: boolean;
  enough: boolean;
  sources: Source[];
};
export type Round = { verdict?: string; notes?: string };
export type Card = {
  id: string;
  era: number;
  claim: string;
  answer: string;
  status: string;
  content_approved?: boolean;
  heard: { who?: string; url: string; quote: string }[];
  facts: Fact[];
  contested: (string | { text: string; sources?: Source[] })[];
  not_claimed: string[];
  could_not_verify?: string[];
  // Each sentence of the answer and the facts (by index) the citation reviewer tied it to.
  answer_claims?: { says: string; facts: number[] }[];
  review?: { skeptic?: Round; citer?: Round };
};
type Site = {
  chapters: { n: number; title: string }[];
  cards: Card[];
  docs: Record<string, { title: string; html: string }>;
  standing: string;
};

export const site: Site = JSON.parse(
  readFileSync(path.join(process.cwd(), 'data', 'site.json'), 'utf8'),
);

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
