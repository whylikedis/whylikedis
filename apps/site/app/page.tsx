import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Callout } from '@/components/ui/callout';
import { CTASection } from '@/components/ui/patterns/cta-section';
import { Card, CardContent, CardLink } from '@/components/ui/card';
import { CountUp } from '@/components/ui/effects/count-up';
import { DrawOn } from '@/components/ui/effects/draw-on';
import { Marker } from '@/components/ui/effects/marker';
import { PointerSurface } from '@/components/ui/effects/pointer-surface';
import { Reveal } from '@/components/ui/effects/reveal';
import { SplitText } from '@/components/ui/effects/split-text';
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
  sourceMix,
} from './answer-parts';
import { counts, site } from './data';
import { HOME_DESCRIPTION, HOME_TITLE } from './home-copy';
import { shareOf } from './share-cards';
import { pageMeta } from '@/lib/share-image';
import { HeardSearch } from './heard-search';
import { HowItWorksStory } from './how-it-works-story';
import { KitchenTable } from './kitchen-table';
import { PracticeTalk, Said } from './practice-talk';

// One address per page, so a shared link with tracking or a missing slash still counts as this page.
export const metadata: Metadata = {
  ...pageMeta({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
    share: shareOf(''),
  }),
  // The home page keeps the bare site name as its tab title.
  title: { absolute: 'WhyLikeDIs' },
};

// The talk on the home page is a real answer, word for word: the claim, its first lines with their
// sources, and what is still argued. Nothing in it is written for the home page.
const FEATURED = 'era7-slogan-history-and-meanings';

const STEPS = [
  [
    'Heard',
    'Start from their exact words',
    'Pick the sentence your child came home with.',
  ],
  [
    'Say',
    'A short answer, out loud',
    'Plain words a parent can say at dinner, each tied to its source.',
  ],
  [
    'Next',
    'Be ready for the follow-up',
    'The other side in its own words, and what is still argued.',
  ],
] as const;

// What kind of source the shown answers quote, and how often: the record itself first. Counted from
// the data, so the strip never names a source an answer does not cite.
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
              <Link href={`/answers/${c.id}/`} data-intent="home_answer">
                The whole answer
              </Link>
            </Dialogue.Suggestion>
            {others.map((x) => (
              <ViewTransition name={`claim-${x.id}`} key={x.id}>
                <Dialogue.Suggestion asChild>
                  <Link href={`/answers/${x.id}/`} data-intent="home_answer">
                    {x.claim}
                  </Link>
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
    <Section container="wide" spacing="comfortable">
      <Grid gap="xl">
        <GridItem span={12} lgSpan={7}>
          <Stack gap="lg">
            <Stack gap="md">
              <Cluster gap="sm">
                <Badge variant="outline">
                  <span lang="he" dir="rtl">
                    דוגרי
                  </span>
                </Badge>
                <Typography variant="ui-sm" tone="muted">
                  Say it straight
                </Typography>
              </Cluster>
              <Typography as="h1" variant="h1">
                <SplitText>{HOME_TITLE}</SplitText>
              </Typography>
              <Typography variant="long" tone="muted">
                {HOME_DESCRIPTION}
              </Typography>
            </Stack>
            <HeardSearch items={searchItems()} />
            <Cluster gap="md">
              <Link
                href="/facts/"
                className={buttonVariants({ variant: 'highlight', size: 'lg' })}
                data-intent="home_hero_answers"
              >
                See the answers
              </Link>
              <Link
                href="/how-we-check/"
                className={buttonVariants({ variant: 'link', size: 'lg' })}
                data-intent="home_hero_how_we_check"
              >
                How we check
              </Link>
            </Cluster>
          </Stack>
        </GridItem>
        <GridItem span={12} lgSpan={5}>
          <DrawOn stagger={110}>
            <KitchenTable />
          </DrawOn>
        </GridItem>
      </Grid>
    </Section>
  );
}

// The talk as a reading section: what it is on the left, a real answer on the right.
function PracticeSection() {
  return (
    <Section container="wide" spacing="comfortable">
      <Grid gap="xl">
        <GridItem span={12} lgSpan={5}>
          <Reveal>
            <SectionHeader
              align="start"
              eyebrow="Practice the talk"
              title="A real answer, line by line, with the source under every sentence"
              tagline={
                <>
                  Nothing here is written for the home page. It is one of our
                  answers, <Marker tone="primary">word for word</Marker>.
                </>
              }
            />
          </Reveal>
        </GridItem>
        <GridItem span={12} lgSpan={7}>
          <Reveal delay={120}>
            <Talk />
          </Reveal>
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
  // Two claims can share a source. Each card shows the first quote of its own that no earlier
  // card already shows, so the row never reads the same words twice.
  const used = new Set<string>();
  const quoteOf = new Map(
    cards.map((c) => {
      const h = c.heard.find((x) => !used.has(x.quote)) ?? c.heard[0];
      if (h) used.add(h.quote);
      return [c.id, h] as const;
    }),
  );
  return (
    <Section container="wide" spacing="comfortable">
      <Reveal>
        <SectionHeader
          align="start"
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
                    {/* The source's own words, as copied. The back holds two lines of the
                        answer, so without them the front was mostly empty card. */}
                    {quoteOf.get(c.id) && (
                      <Typography as="blockquote" variant="body" tone="muted">
                        “{quoteOf.get(c.id)?.quote}”
                      </Typography>
                    )}
                    {quoteOf.get(c.id) && (
                      <Typography variant="ui" tone="muted">
                        {quoteOf.get(c.id)?.who}
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
                        data-intent="home_answer"
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

// The record as an index: every topic, how many questions it holds, and the other ways in.
const TOOLS = [
  [
    '/questions/',
    'Questions we tested',
    'A hunch is a question until a source answers it.',
  ],
  [
    '/open/',
    'Open questions',
    'Answers whose rounds of review ended without a verdict.',
  ],
] as const;

function Browse() {
  const topics = site.chapters
    .map((ch) => ({
      ...ch,
      count: site.cards.filter((c) => c.era === ch.n).length,
    }))
    .filter((t) => t.count > 0);
  return (
    <Section container="wide" spacing="comfortable" tone="muted">
      <Reveal>
        <SectionHeader
          align="start"
          eyebrow="The record"
          title="Browse by topic"
          tagline="Every question we are working on, filed by topic, each with its sources."
        />
      </Reveal>
      <Stack gap="xl">
        <Grid gap="md">
          {topics.map((t, i) => (
            <GridItem span={12} mdSpan={6} lgSpan={4} key={t.n}>
              <Reveal delay={(i % 3) * 80} className="h-full">
                <PointerSurface className="h-full rounded-xl">
                  <Card className="h-full">
                    <CardContent>
                      <Stack gap="xs">
                        <Typography variant="ui-sm" tone="muted">
                          {t.count} {t.count === 1 ? 'question' : 'questions'}
                        </Typography>
                        <Typography as="h3" variant="h5">
                          <CardLink asChild>
                            <Link href={`/facts/#ch${t.n}`}>{t.title}</Link>
                          </CardLink>
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </PointerSurface>
              </Reveal>
            </GridItem>
          ))}
        </Grid>
        <Grid gap="md">
          {TOOLS.map(([href, title, body]) => (
            <GridItem span={12} mdSpan={6} key={href}>
              <Card>
                <CardContent>
                  <Stack gap="xs">
                    <Typography as="h3" variant="h4">
                      <CardLink asChild>
                        <Link href={href}>{title}</Link>
                      </CardLink>
                    </Typography>
                    <Typography variant="ui" tone="muted">
                      {body}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </Stack>
    </Section>
  );
}

function HowItWorks() {
  const cards = shownCards();
  const c = cards.find((x) => x.id === FEATURED) ?? cards[0];
  const first = c && answerLines(c)[0];
  return (
    <Section container="wide" spacing="comfortable">
      <Reveal>
        <SectionHeader
          align="start"
          eyebrow="How it works"
          title="From what they heard to what you say"
        />
      </Reveal>
      {c && first ? (
        <HowItWorksStory
          steps={STEPS.map(([kicker, title, body]) => ({
            kicker,
            title,
            body,
          }))}
          claim={c.claim}
          says={first.says}
          sources={[
            ...new Set(first.sources.map((s) => s.publisher).filter(Boolean)),
          ].slice(0, 3)}
          argued={contestedText(c)[0]}
        />
      ) : null}
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
            surface="plain"
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
            <Stack gap="lg">
              <SectionHeader
                align="start"
                spacing="none"
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
      >
        <Stack gap="md" align="center">
          <HeardSearch items={searchItems()} />
          <Link
            href="/facts/"
            className={buttonVariants({ variant: 'link' })}
            data-intent="home_every_answer"
          >
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
      <PracticeSection />
      <CheckIt />
      <Browse />
      <HowItWorks />
      <Numbers />
      <WhereWeStand />
      <Closing />
    </>
  );
}
