import { appPack } from '@whylikedis/content';
import { Section } from '@/components/ui/section';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { pageMeta } from '@/lib/share-image';
import { PREVIEW, site } from '../data';
import { shareOf } from '../share-cards';
import { UPDATES_DESCRIPTION, UPDATES_TITLE } from './copy';
import { UpdatesFeed, type Update } from './updates-feed';

export const metadata = pageMeta({
  title: UPDATES_TITLE,
  description: UPDATES_DESCRIPTION,
  path: '/updates/',
  share: shareOf('updates'),
});

// The app's Updates feed, on the web: only our own finished work, newest first. Today that is an
// answer once a second reader has signed it off; data releases and sessions join through the same
// PackUpdate shape when they have a reviewed source of their own.
const updates: Update[] = appPack(site, { preview: PREVIEW }).updates.map(
  (u) => ({
    id: u.id,
    date: u.date,
    kind: 'New answer',
    // In quotes: it is the claim people hear, which the answer checks, not our statement.
    title: `“${u.title}”`,
    description: u.chapter,
    href: `/answers/${u.target.id}/`,
  }),
);

export default function Updates() {
  return (
    <Section container="content" spacing="tight">
      <Stack gap="lg">
        <Stack gap="sm">
          <Typography variant="ui-sm" tone="primary">
            Updates
          </Typography>
          <Typography as="h1" variant="h1">
            {UPDATES_TITLE}
          </Typography>
          <Typography variant="long" tone="muted">
            {UPDATES_DESCRIPTION}
          </Typography>
        </Stack>
        <UpdatesFeed updates={updates} />
      </Stack>
    </Section>
  );
}
