import { appPack } from '@whylikedis/content';
import { dayKey } from '@whylikedis/games';
import { Section } from '@/components/ui/section';
import { pageMeta } from '@/lib/share-image';
import { PREVIEW, site } from '../data';
import { shareOf } from '../share-cards';
import { DAILY_DESCRIPTION, DAILY_TITLE } from './copy';
import { DailyQuestion, type DailyCard } from './daily-question';

export const metadata = pageMeta({
  title: DAILY_TITLE,
  description: DAILY_DESCRIPTION,
  path: '/daily/',
  share: shareOf('daily'),
});

// The pool is the app's: the same shown cards in the same order, so the app and the site deal the
// same card on the same day. Trimmed to what one round shows.
const cards: DailyCard[] = appPack(site, { preview: PREVIEW }).cards.map(
  (c) => ({
    id: c.id,
    chapter: c.chapter,
    claim: c.claim,
    heard: c.heard ? { who: c.heard.who, quote: c.heard.quote } : null,
    lines: c.lines.map((l) => l.says),
    sources: [
      ...new Set(c.lines.flatMap((l) => l.sources.map((s) => s.publisher))),
    ],
    verified: c.verified,
  }),
);

export default function Daily() {
  return (
    <Section container="content" spacing="tight">
      {/* The server deals by today's date in UTC; the browser re-deals by the reader's own day. */}
      <DailyQuestion
        cards={cards}
        initialDay={dayKey(Date.now(), 'UTC')}
        description={DAILY_DESCRIPTION}
      />
    </Section>
  );
}
