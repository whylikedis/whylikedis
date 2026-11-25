import { appPack } from '@whylikedis/content';
import { PREVIEW, site } from '../data';
import type { DailyCard } from './daily-question';

// The pool is the app's: the same shown cards in the same order, so the app and the site deal the
// same card on the same day. Trimmed to what one round shows.
export const dailyCards: DailyCard[] = appPack(site, {
  preview: PREVIEW,
}).cards.map((c) => ({
  id: c.id,
  chapter: c.chapter,
  claim: c.claim,
  heard: c.heard ? { who: c.heard.who, quote: c.heard.quote } : null,
  lines: c.lines.map((l) => l.says),
  sources: [
    ...new Set(c.lines.flatMap((l) => l.sources.map((s) => s.publisher))),
  ],
  verified: c.verified,
}));

// Practice uses reviewed answers only: a round is for learning a reply, so it never teaches one
// that is still being checked.
export const practiceCards: DailyCard[] = dailyCards.filter((c) => c.verified);
