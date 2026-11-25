import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { pageMeta } from '@/lib/share-image';
import Link from 'next/link';
import { shareOf } from '../share-cards';
import { PLAY_DESCRIPTION, PLAY_TITLE } from './copy';
import { CodeForm } from './join/player-room';

export const metadata = pageMeta({
  title: PLAY_TITLE,
  description: PLAY_DESCRIPTION,
  path: '/play/',
  share: shareOf('play'),
});

export default function Play() {
  return (
    <Section container="content" spacing="tight">
      <Stack gap="lg">
        <Stack gap="sm">
          <Typography variant="ui-sm" tone="primary">
            Live game
          </Typography>
          <Typography as="h1" variant="h1">
            {PLAY_TITLE}
          </Typography>
          <Typography variant="long" tone="muted">
            {PLAY_DESCRIPTION}
          </Typography>
        </Stack>
        <Stack gap="sm">
          <Typography as="h2" variant="h3">
            How it works
          </Typography>
          <ol className="text-long grid list-decimal gap-2 ps-6">
            <li>The host opens a room on a screen everyone can see.</li>
            <li>Players scan the code with their phones and pick a name.</li>
            <li>
              Each round shows something people say. Pick the reply that answers
              it; faster right answers score more.
            </li>
            <li>After each round, the whole answer and its sources.</li>
          </ol>
        </Stack>
        <Cluster gap="sm">
          <Button size="lg" render={<Link href="/play/host/" />}>
            Host a game
          </Button>
        </Cluster>
        <Stack gap="sm">
          <Typography as="h2" variant="h3">
            Joining a game?
          </Typography>
          <CodeForm bad={false} />
        </Stack>
      </Stack>
    </Section>
  );
}
