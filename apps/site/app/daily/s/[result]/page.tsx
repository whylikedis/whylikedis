// Where a shared daily result lands. The link unfurls into a picture of the result (its share
// image), and the page itself invites the reader to play today's question. It shows no claim and
// no answer, so a share never spoils the day for anyone.
import {
  SHARE_RESULT_SLUGS,
  shareResultCopy,
  shareResultOf,
} from '@whylikedis/games';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { pageMeta } from '@/lib/share-image';
import { shareOf } from '../../../share-cards';
import { DAILY_DESCRIPTION, DAILY_TITLE } from '../../copy';

export const dynamicParams = false;

export const generateStaticParams = () =>
  SHARE_RESULT_SLUGS.map((result) => ({ result }));

type Props = { params: Promise<{ result: string }> };

export async function generateMetadata({ params }: Props) {
  const { result } = await params;
  const r = shareResultOf(result);
  if (!r) return {};
  const { title, description } = shareResultCopy(r);
  return {
    ...pageMeta({
      title: `${title} ${DAILY_TITLE}`,
      socialTitle: title,
      description,
      path: `/daily/s/${result}/`,
      share: shareOf(`daily/s/${result}`),
    }),
    // A share landing, not a page of its own: search engines are sent to the daily page.
    alternates: { canonical: '/daily/' },
    robots: { index: false, follow: true },
  };
}

export default async function SharedResult({ params }: Props) {
  const { result } = await params;
  const r = shareResultOf(result);
  if (!r) notFound();
  const { title } = shareResultCopy(r);
  return (
    <Section container="content" spacing="comfortable">
      <Stack gap="md">
        <Typography variant="caption" tone="primary">
          {DAILY_TITLE}
        </Typography>
        <Typography variant="h1">{title}</Typography>
        <Typography variant="body" tone="muted">
          {DAILY_DESCRIPTION} Two minutes, and nothing to sign up for.
        </Typography>
        <Cluster gap="sm">
          <Button render={<Link href="/daily/" />}>
            Play today’s question
          </Button>
          <Button variant="outline" render={<Link href="/facts/" />}>
            Read the answers
          </Button>
        </Cluster>
      </Stack>
    </Section>
  );
}
