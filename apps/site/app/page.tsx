import { Ear, MessageCircle, MessagesSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Callout } from '@/components/ui/callout';
import { CTASection } from '@/components/ui/patterns/cta-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountUp } from '@/components/ui/effects/count-up';
import { GridField } from '@/components/ui/effects/grid-field';
import { Reveal } from '@/components/ui/effects/reveal';
import { SplitText } from '@/components/ui/effects/split-text';
import { FeaturedIcon } from '@/components/ui/featured-icon';
import { Grid, GridItem } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/patterns/section-header';
import { Dialogue } from '@/components/ui/patterns/dialogue';
import { FlipCard } from '@/components/ui/patterns/flip-card';
import { StatGroup } from '@/components/ui/patterns/stat-group';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import {
  answerLines,
  contestedText,
  searchItems,
  shownCards,
} from './answer-parts';
import { counts, site } from './data';
import { HeardSearch } from './heard-search';
import { PracticeTalk, Said } from './practice-talk';

// One address per page, so a shared link with tracking or a missing slash still counts as this page.
export const metadata: Metadata = { alternates: { canonical: '/' } };

// The talk on the home page is a real answer, word for word: the claim, its first lines with their
// sources, and what is still argued. Nothing in it is written for the home page.
const FEATURED = 'era7-slogan-history-and-meanings';

const STEPS = [
  [
    Ear,
    'Heard',
    'Start from their exact words',
    'Pick the sentence your child came home with.',
  ],
  [
    MessageCircle,
    'Say',
    'A short answer, out loud',
    'Plain words a parent can say at dinner, each tied to its source.',
  ],
  [
    MessagesSquare,
    'Next',
    'Be ready for the follow-up',
    'The other side in its own words, and what is still argued.',
  ],
] as const;

// What kind of source the shown answers quote, and how often: the record itself first. Counted from
// the data, so the strip never names a source an answer does not cite.
const KINDS: [string[], string][] = [
  [['primary', 'government'], 'from the record itself'],
  [['scholarly', 'reference'], 'from scholars and reference works'],
  [['news'], 'from news reports'],
  [['advocacy'], 'from advocacy groups'],
];
function sourceMix() {
  const all = shownCards().flatMap((c) => c.facts.flatMap((f) => f.sources));
  return KINDS.map(([kinds, label]) => ({
    label,
    n: all.filter((s) => kinds.includes(s.kind)).length,
  })).filter((k) => k.n > 0);
}

// One card per claim (the fuller card when two share a claim), the featured one last since the hero
// already plays it.
function claimsToCheck() {
  const byClaim = new Map<string, ReturnType<typeof shownCards>[number]>();
  for (const c of shownCards()) {
    const had = byClaim.get(c.claim);
    if (!had || c.facts.length > had.facts.length) byClaim.set(c.claim, c);
  }
  return [...byClaim.values()]
    .sort((a, b) => Number(a.id === FEATURED) - Number(b.id === FEATURED))
    .slice(0, 3);
}

function Talk() {
  const cards = shownCards();
  const c = cards.find((x) => x.id === FEATURED) ?? cards[0];
  if (!c) return null;
  const all = answerLines(c);
  const others = cards.filter((x) => x.claim !== c.claim).slice(0, 2);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Typography as="h2" variant="h4">
            Practice the talk
          </Typography>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          <PracticeTalk
            claim={c.claim}
            first={all.slice(0, 2)}
            more={all.slice(2, 4)}
            argued={contestedText(c)[0]}
          />
          <Dialogue.Suggestions>
            <Dialogue.Suggestion asChild>
              <Link href={`/answers/${c.id}/`}>The whole answer</Link>
            </Dialogue.Suggestion>
            {others.map((x) => (
              <ViewTransition name={`claim-${x.id}`} key={x.id}>
                <Dialogue.Suggestion asChild>
                  <Link href={`/answers/${x.id}/`}>{x.claim}</Link>
                </Dialogue.Suggestion>
              </ViewTransition>
            ))}
          </Dialogue.Suggestions>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Hero() {
  return (
    <Section container="wide" tone="brand" spacing="comfortable">
      <GridField
        mark="lines"
        cell={48}
        lineColor="color-mix(in oklab, var(--primary-foreground) 12%, transparent)"
        litColor="var(--primary-foreground)"
        intensity={0.1}
      />
      <Grid gap="xl">
        <GridItem span={12} lgSpan={6}>
          <Stack gap="lg">
            <Stack gap="sm">
              <Cluster gap="sm">
                <Badge variant="highlight">For parents</Badge>
                <Badge variant="outline">
                  <span lang="he" dir="rtl">
                    דוגרי
                  </span>
                </Badge>
              </Cluster>
              <Typography as="h1" variant="h1">
                <SplitText>
                  Clear answers about Israel, each with sources you can check.
                </SplitText>
              </Typography>
              <Typography variant="long">
                When your child comes home with a claim about Israel, find an
                answer you can give in two minutes, the other side in its own
                words, and the source for every fact.
              </Typography>
            </Stack>
            <HeardSearch items={searchItems()} />
            <Cluster gap="md">
              <Link
                href="/facts/"
                className={buttonVariants({ variant: 'highlight', size: 'lg' })}
              >
                See the answers
              </Link>
              <Link
                href="/method/"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                How we check
              </Link>
            </Cluster>
          </Stack>
        </GridItem>
        <GridItem span={12} lgSpan={6}>
          <Talk />
        </GridItem>
      </Grid>
    </Section>
  );
}

function SourcesStrip() {
  return (
    <Section container="wide" spacing="tight" divider="bottom">
      <Reveal effect="fade">
        <Stack gap="sm" align="center">
          <Typography variant="ui-sm" tone="muted" align="center">
            Every sentence is tied to a quote you can open
          </Typography>
          <Cluster gap="sm" justify="center">
            {sourceMix().map((k) => (
              <Badge variant="secondary" key={k.label}>
                {k.n} {k.label}
              </Badge>
            ))}
          </Cluster>
        </Stack>
      </Reveal>
    </Section>
  );
}

// The claim as the other side says it, then what the record shows, one tap away. The answer is
// in the page either way: the accordion only folds it.
function CheckIt() {
  const cards = claimsToCheck();
  if (cards.length === 0) return null;
  return (
    <Section container="wide" spacing="comfortable">
      <Reveal>
        <SectionHeader
          align="start"
          eyebrowStyle="pill"
          eyebrow="Heard it? Check it."
          title="What they heard, and what the record shows"
          tagline="Each claim in the words of someone who makes it. Turn a card over to see the first lines of our answer, with the source for each."
        />
      </Reveal>
      <Reveal>
        <Grid gap="lg">
          {cards.map((c) => (
            <GridItem span={12} lgSpan={4} key={c.id}>
              <FlipCard
                revealLabel="What the record shows"
                returnLabel="Back to what they heard"
                front={
                  <Stack gap="sm">
                    <Typography variant="ui-sm" tone="muted">
                      They heard
                    </Typography>
                    <Typography as="h3" variant="h4">
                      {c.claim}
                    </Typography>
                    {c.heard[0] && (
                      <Typography variant="ui" tone="muted">
                        {c.heard[0].who}
                      </Typography>
                    )}
                  </Stack>
                }
                back={
                  <Stack gap="sm">
                    <Typography variant="ui-sm" tone="primary">
                      What the record shows
                    </Typography>
                    <Typography variant="body">
                      <Said lines={answerLines(c).slice(0, 2)} />
                    </Typography>
                    <Cluster>
                      <Link
                        href={`/answers/${c.id}/`}
                        className={buttonVariants({ variant: 'link' })}
                      >
                        The whole answer
                      </Link>
                    </Cluster>
                  </Stack>
                }
              />
            </GridItem>
          ))}
        </Grid>
      </Reveal>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section container="wide" spacing="comfortable" tone="muted">
      <Reveal>
        <SectionHeader
          align="start"
          eyebrowStyle="pill"
          eyebrow="How it works"
          title="From what they heard to what you say"
        />
      </Reveal>
      <Grid gap="lg">
        {STEPS.map(([Icon, kicker, title, body], i) => (
          <GridItem span={12} mdSpan={4} key={kicker}>
            <Reveal delay={i * 120}>
              <Stack gap="sm">
                <FeaturedIcon size="lg">
                  <Icon />
                </FeaturedIcon>
                <Typography variant="ui-sm" tone="primary">
                  {i + 1} · {kicker}
                </Typography>
                <Typography as="h3" variant="h3">
                  {title}
                </Typography>
                <Typography tone="muted">{body}</Typography>
              </Stack>
            </Reveal>
          </GridItem>
        ))}
      </Grid>
    </Section>
  );
}

function Numbers() {
  const n = counts();
  return (
    <Section container="wide" spacing="comfortable" tone="brand">
      <Reveal>
        <Stack gap="lg">
          <StatGroup
            cols={3}
            layout="value-first"
            stats={[
              {
                value: <CountUp value={n.verified} />,
                label: 'answers checked by a second reader',
              },
              {
                value: <CountUp value={n.quotes} />,
                label: 'source quotes you can check',
              },
              {
                value: <CountUp value={n.cards} />,
                label: 'questions we are working on',
              },
            ]}
          />
          <Typography variant="long">
            An answer is published in full only after someone who did not write
            it has tried to break it. The rest are still being checked, and each
            one says so.
          </Typography>
        </Stack>
      </Reveal>
    </Section>
  );
}

function WhereWeStand() {
  return (
    <Section container="wide" spacing="comfortable">
      <Grid gap="xl">
        <GridItem span={12} lgSpan={4}>
          <Reveal>
            <Stack gap="md">
              <SectionHeader
                align="start"
                spacing="md"
                eyebrowStyle="pill"
                eyebrow="Our position"
                title="Where we stand"
                id="where-we-stand"
              />
              <Callout
                tone="highlight"
                kicker={
                  <span lang="he" dir="rtl">
                    דוגרי
                  </span>
                }
              >
                Dugri is Israeli for “say it straight”. That is how we answer.
              </Callout>
            </Stack>
          </Reveal>
        </GridItem>
        <GridItem span={12} lgSpan={8}>
          <Reveal delay={120}>
            {/* Built by export.py from docs/chapters.md, every character escaped before any tag is added. */}
            <Prose
              variant="long"
              dangerouslySetInnerHTML={{ __html: site.standing }}
            />
          </Reveal>
        </GridItem>
      </Grid>
    </Section>
  );
}

function Closing() {
  return (
    <Reveal effect="scale">
      <CTASection
        variant="card"
        tone="subtle"
        title="Heard something today?"
        description="Type a few of the words they used. The answer opens with its sources."
        background={<GridField mark="dots" fade="radial" />}
      >
        <Stack gap="md" align="center">
          <HeardSearch items={searchItems()} />
          <Link href="/facts/" className={buttonVariants({ variant: 'link' })}>
            Or see every answer
          </Link>
        </Stack>
      </CTASection>
    </Reveal>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <SourcesStrip />
      <CheckIt />
      <HowItWorks />
      <Numbers />
      <WhereWeStand />
      <Closing />
    </>
  );
}
