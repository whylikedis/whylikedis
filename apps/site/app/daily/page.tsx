import { dayKey } from '@whylikedis/games';
import { Section } from '@/components/ui/section';
import { pageMeta } from '@/lib/share-image';
import { shareOf } from '../share-cards';
import { DAILY_DESCRIPTION, DAILY_TITLE } from './copy';
import { dailyCards as cards } from './cards';
import { DailyQuestion } from './daily-question';

export const metadata = pageMeta({
  title: DAILY_TITLE,
  description: DAILY_DESCRIPTION,
  path: '/daily/',
  share: shareOf('daily'),
});

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
