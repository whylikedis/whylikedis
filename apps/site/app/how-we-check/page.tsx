import Link from 'next/link';
import {
  BookOpenCheck,
  Files,
  GraduationCap,
  Quote,
  Scale,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';
import { Reveal } from '@/components/ui/effects/reveal';
import { FeaturedIcon } from '@/components/ui/featured-icon';
import { Grid, GridItem } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/patterns/section-header';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { pageMeta } from '@/lib/share-image';
import { counts } from '../data';
import { shareOf } from '../share-cards';
import { HOW_DESCRIPTION, HOW_TITLE } from './copy';

export const metadata = pageMeta({
  title: HOW_TITLE,
  description: HOW_DESCRIPTION,
  path: '/how-we-check/',
  share: shareOf('how-we-check'),
});

// The method for a parent, in the words the rules already use (AGENTS.md, docs/verification.md).
// The engineering record stays at /method/ and is linked at the end.
const STEPS = [
  {
    icon: BookOpenCheck,
    title: 'We read the source ourselves',
    body: 'Every quote is copied from the page it comes from, never from memory or a search summary. If we cannot find it, the answer says so.',
  },
  {
    icon: Files,
    title: 'Three reliable sources for each fact',
    body: 'A fact needs three reliable, independent sources. Governments and advocacy groups can be quoted, but they do not count toward the three, and outlets carrying one news agency’s story count once.',
  },
  {
    icon: Quote,
    title: 'The other side, in its own words',
    body: 'The claim is quoted from someone who makes it, never a weaker version that is easier to answer.',
  },
  {
    icon: Scale,
    title: 'Say what is still argued',
    body: 'Where serious historians disagree, the answer names the positions. A fact is never left out because it is inconvenient.',
  },
  {
    icon: UserCheck,
    title: 'A second reader tries to break it',
    body: 'Someone who did not write the answer attacks it first, then ties every sentence to a fact. A sentence with no fact behind it is removed.',
  },
  {
    icon: GraduationCap,
    title: 'Approved for teaching, last',
    body: 'Only our teacher can mark an answer approved for teaching. Until then, the answer says it is not.',
  },
] as const;

export default function HowWeCheck() {
  const n = counts();
  const labels = [
    {
      badge: <Badge variant="outline">Still being checked</Badge>,
      count: n.cards - n.verified,
      body: 'Written, with its sources, but no second reader has finished with it. Only the claim is shown.',
    },
    {
      badge: <Badge variant="success">Checked by a second reader</Badge>,
      count: n.verified,
      body: 'A reader who did not write it has attacked it and tied every sentence to a fact. The whole answer is shown.',
    },
    {
      badge: <Badge variant="outline">attack round: holds</Badge>,
      count: null,
      body: 'How each round of review ended: the answer holds, or it was weakened and says less.',
    },
    {
      badge: <Badge variant="outline">Approved for teaching</Badge>,
      count: n.approved,
      body: 'Our teacher has read it and it is ready to teach from.',
    },
  ];
  return (
    <>
      <Section container="wide" spacing="tight">
        <Stack gap="xl">
          <div className="max-w-3xl">
            <Stack gap="sm">
              <Typography variant="ui-sm" tone="primary">
                How we check
              </Typography>
              <Typography as="h1" variant="h1">
                {HOW_TITLE}
              </Typography>
              <Typography variant="long" tone="muted">
                {HOW_DESCRIPTION}
              </Typography>
            </Stack>
          </div>
          <Grid gap="lg">
            {STEPS.map((s, i) => (
              <GridItem span={12} mdSpan={6} lgSpan={4} key={s.title}>
                <Reveal delay={(i % 3) * 80} className="h-full">
                  <Card className="h-full">
                    <CardContent>
                      <Stack gap="sm">
                        <FeaturedIcon size="lg">
                          <s.icon />
                        </FeaturedIcon>
                        <Typography variant="ui-sm" tone="primary">
                          Step {i + 1}
                        </Typography>
                        <Typography as="h2" variant="h4">
                          {s.title}
                        </Typography>
                        <Typography tone="muted">{s.body}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </GridItem>
            ))}
          </Grid>
        </Stack>
      </Section>

      <Section container="wide" spacing="comfortable">
        <Grid gap="xl">
          <GridItem span={12} lgSpan={4}>
            <SectionHeader
              align="start"
              spacing="none"
              eyebrow="On every answer"
              title="What the labels mean"
              id="labels"
            />
          </GridItem>
          <GridItem span={12} lgSpan={8}>
            <Stack render={<dl />} gap="lg">
              {labels.map((l, i) => (
                // A <dl> may group each term and its description in one <div>, and only one: the
                // Reveal is that div, so the stack's gap goes on it.
                <Reveal delay={i * 60} key={i} className="flex flex-col gap-2">
                  <dt>
                    <Cluster gap="sm" align="center">
                      {l.badge}
                      {l.count !== null && (
                        <Typography variant="ui-sm" tone="muted">
                          {l.count === 0
                            ? 'None yet'
                            : `${l.count} ${l.count === 1 ? 'answer' : 'answers'}`}
                        </Typography>
                      )}
                    </Cluster>
                  </dt>
                  <dd>
                    <Typography>{l.body}</Typography>
                  </dd>
                </Reveal>
              ))}
            </Stack>
          </GridItem>
        </Grid>
      </Section>

      <Section container="wide" spacing="comfortable" divider="top">
        <div className="max-w-3xl">
          <Stack gap="md">
            <Typography as="h2" variant="h3">
              Want every detail?
            </Typography>
            <Typography tone="muted">
              Answers whose rounds of review ended without a verdict are listed
              with what is missing. The full technical record shows each check
              and the tools that run it.
            </Typography>
            <Cluster gap="md" align="center">
              <Link href="/facts/" className={buttonVariants()}>
                See the answers
              </Link>
              <Link
                href="/open/"
                className={buttonVariants({ variant: 'outline' })}
              >
                Open questions
              </Link>
              <Link
                href="/method/"
                className={buttonVariants({ variant: 'link' })}
              >
                The technical record
              </Link>
            </Cluster>
          </Stack>
        </div>
      </Section>
    </>
  );
}
