// The shape of data/site.json, which apps/site/export.py writes from facts/ and docs/.
// The gate decides what a card says; the site and the app only display it.
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
export type Chapter = { n: number; title: string };
export type Site = {
  chapters: Chapter[];
  cards: Card[];
  docs: Record<
    string,
    {
      title: string;
      html: string;
      toc: { id: string; label: string; level: 2 | 3 | 4 }[];
    }
  >;
  standing: string;
};
