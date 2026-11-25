import type { CitationSourceData } from '@/components/ui/patterns/citation';
import { contestedText, isShown, quoteCount } from '@whylikedis/content';
import { type Card, type Fact, PREVIEW, site } from './data';

export { contestedText, quoteCount };

// The answer pages show only what the gate passed: a verified card, or any card in the local preview.
export const shownCards = () => site.cards.filter((c) => isShown(c, PREVIEW));

export const chapterTitle = (c: Card) =>
  site.chapters.find((ch) => ch.n === c.era)?.title ?? `Chapter ${c.era}`;

const sourcesOf = (facts: Fact[]): CitationSourceData[] =>
  facts.flatMap((f) =>
    f.sources.map((s) => ({
      publisher: s.publisher,
      url: s.url,
      kind: s.kind,
      quote: s.quote,
    })),
  );

// "United Nations, Question of Palestine (exchange of letters ...)" -> "United Nations". The chip itself
// caps a long name with an ellipsis, and the popover names every source in full.
const shortName = (publisher: string) =>
  publisher.split(' (')[0].split(', ')[0];

// A chip names the first publisher and how many more there are; the popover lists them all.
const chipLabel = (sources: CitationSourceData[]) => {
  const names = [...new Set(sources.map((s) => shortName(s.publisher)))];
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
};

export type Line = {
  says: string;
  sources: CitationSourceData[];
  chip: string;
};

// The answer, one sentence per line, each with the facts the reviewer tied it to. A card without
// that mapping is shown as one line with no chip, rather than with a chip it cannot back.
export const answerLines = (c: Card): Line[] => {
  const claims = c.answer_claims?.length
    ? c.answer_claims
    : [{ says: c.answer, facts: [] }];
  return claims.map((a) => {
    const sources = sourcesOf(a.facts.map((i) => c.facts[i]).filter(Boolean));
    return {
      says: a.says,
      sources,
      chip: sources.length ? chipLabel(sources) : '',
    };
  });
};

// The record, by the first year each fact names; facts that name no year stay on the full card.
// The quote shown is the fact's first source, which the card lists first (usually the record itself).
export const record = (c: Card) =>
  c.facts
    .flatMap((f) => {
      const year = f.text.match(/\b(1[89]\d\d|20\d\d)\b/)?.[1];
      const s = f.sources[0];
      return year && s ? [{ year: Number(year), source: s }] : [];
    })
    .sort((a, b) => a.year - b.year);

// The search list: every claim once (the fuller card when two share a claim), each going to the best
// page we have. A value must be unique, so it is the card id; the href travels beside it.
export const searchItems = () => {
  const seen = new Set<string>();
  const shown = (c: Card) => isShown(c, PREVIEW);
  const sorted = [...site.cards].sort(
    (a, b) =>
      Number(shown(b)) - Number(shown(a)) || b.facts.length - a.facts.length,
  );
  return sorted.flatMap((c) => {
    if (seen.has(c.claim)) return [];
    seen.add(c.claim);
    return [
      {
        value: c.id,
        href: shown(c) ? `/answers/${c.id}/` : `/facts/#ch${c.era}`,
        label: shown(c) ? c.claim : `${c.claim} (still being checked)`,
      },
    ];
  });
};

// Where the quotes come from, by kind of source: the strip on the home page and its share image.
const KINDS: [string[], string][] = [
  [['primary', 'government'], 'from the record itself'],
  [['scholarly', 'reference'], 'from scholars and reference works'],
  [['news'], 'from news reports'],
  [['advocacy'], 'from advocacy groups'],
];
export function sourceMix() {
  const all = shownCards().flatMap((c) => c.facts.flatMap((f) => f.sources));
  return KINDS.map(([kinds, label]) => ({
    label,
    n: all.filter((s) => kinds.includes(s.kind)).length,
  })).filter((k) => k.n > 0);
}
