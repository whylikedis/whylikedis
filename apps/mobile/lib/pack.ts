// The answers the app ships with, written by `npm run content` from the fact base. Bundled, so the
// app opens with everything it needs and works offline.
import type { AppPack, PackCard } from '@whylikedis/content';
import raw from '../content/pack.json';

export const pack = raw as AppPack;
export const cards: readonly PackCard[] = pack.cards;
const byId = new Map(cards.map((c) => [c.id, c]));
export const cardById = (id: string) => byId.get(id);

// "United Nations, Question of Palestine (...)" -> "United Nations": the name a source chip shows.
export const shortName = (publisher: string) =>
  publisher.split(' (')[0].split(', ')[0];
