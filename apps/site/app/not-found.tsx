import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';

export const metadata: Metadata = { title: 'Page not found' };

// An address that leads nowhere: say so plainly, in the site's own look, and offer the two places
// most readers were looking for.
export default function NotFound() {
  return (
    <Section container="prose" spacing="tight">
      <Stack gap="lg">
        <Stack gap="sm">
          <Typography variant="ui-sm" tone="primary">
            Page not found
          </Typography>
          <Typography as="h1" variant="h1">
            There is no page at this address
          </Typography>
          <Typography variant="long" tone="muted">
            It may have moved, or the link may be missing a letter. Every answer
            we have is on one page.
          </Typography>
        </Stack>
        <Cluster gap="sm">
          <Button render={<Link href="/facts/" />}>See every answer</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Back to the start
          </Button>
        </Cluster>
      </Stack>
    </Section>
  );
}
