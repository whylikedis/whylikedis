import { Callout } from '@/components/ui/callout';
import { Section } from '@/components/ui/section';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { pageMeta } from '@/lib/share-image';
import { site } from '../data';
import { shareOf } from '../share-cards';
import { BookingFlow } from './booking-flow';
import { SESSIONS_DESCRIPTION, SESSIONS_TITLE } from './copy';

export const metadata = pageMeta({
  title: SESSIONS_TITLE,
  description: SESSIONS_DESCRIPTION,
  path: '/sessions/',
  share: shareOf('sessions'),
});

// The topics a reader can pick are the chapters of the fact base, so a session starts from the
// same questions the answers do.
export default function Sessions() {
  return (
    <Section container="content" spacing="tight">
      <Stack gap="lg">
        <Stack gap="sm">
          <Typography variant="ui-sm" tone="primary">
            Sessions
          </Typography>
          <Typography as="h1" variant="h1">
            {SESSIONS_TITLE}
          </Typography>
          <Typography variant="long" tone="muted">
            {SESSIONS_DESCRIPTION}
          </Typography>
        </Stack>
        <Callout tone="note" title="Bookings open soon">
          You can try the steps now. Nothing you enter is sent or kept.
        </Callout>
        <BookingFlow topics={site.chapters.map((ch) => ch.title)} />
      </Stack>
    </Section>
  );
}
