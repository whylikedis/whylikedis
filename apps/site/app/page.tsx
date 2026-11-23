import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid, GridItem } from '@/components/ui/grid';
import { Citation } from '@/components/ui/patterns/citation';
import { Dialogue } from '@/components/ui/patterns/dialogue';
import { StatGroup } from '@/components/ui/patterns/stat-group';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { answerLines, contestedText, shownCards } from './answer-parts';
import { counts, site } from './data';

// One address per page, so a shared link with tracking or a missing slash still counts as this page.
export const metadata: Metadata = { alternates: { canonical: '/' } };

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

function Talk() {
  const cards = shownCards();
  const c = cards.find((x) => x.id === FEATURED) ?? cards[0];
  if (!c) return null;
  const lines = answerLines(c).slice(0, 2);
  const argued = contestedText(c)[0];
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
          <Dialogue speakers="inside" aria-label="An example conversation">
            <Dialogue.Turn speaker="Your kid" tone="muted">
              Someone at school said this: {c.claim}
            </Dialogue.Turn>
            <Dialogue.Turn speaker="You" side="end" tone="inverse">
              {lines.map((l, i) => (
                <span key={i}>
                  <Citation
                    marker="chip"
                    sources={l.sources}
                    chipLabel={l.chip}
                  >
                    {l.says}
                  </Citation>{' '}
                </span>
              ))}
            </Dialogue.Turn>
            {argued && (
              <>
                <Dialogue.Turn speaker="Your kid" tone="muted">
                  So who is right?
                </Dialogue.Turn>
                <Dialogue.Turn speaker="You" side="end" tone="inverse">
                  That part is still argued. {argued}
                </Dialogue.Turn>
              </>
            )}
          </Dialogue>
          <Dialogue.Suggestions>
            <Dialogue.Suggestion asChild>
              <Link href={`/answers/${c.id}/`}>The whole answer</Link>
            </Dialogue.Suggestion>
            {others.map((x) => (
              <Dialogue.Suggestion asChild key={x.id}>
                <Link href={`/answers/${x.id}/`}>{x.claim}</Link>
              </Dialogue.Suggestion>
            ))}
          </Dialogue.Suggestions>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const n = counts();
  return (
    <>
      <Section tone="brand" spacing="comfortable">
        <Grid gap="xl">
          <GridItem span={12} lgSpan={6}>
            <Stack gap="lg">
              <Stack gap="sm">
                <Typography variant="ui-sm">For parents</Typography>
                <Typography as="h1" variant="h1">
                  Clear answers about Israel, each with sources you can check.
                </Typography>
                <Typography variant="long">
                  When your child comes home with a claim about Israel, find an
                  answer you can give in two minutes, the other side in its own
                  words, and the source for every fact.
                </Typography>
              </Stack>
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
              <Cluster gap="md">
                <Link
                  href="/facts/"
                  className={buttonVariants({
                    variant: 'highlight',
                    size: 'lg',
                  })}
                >
                  See the answers
                </Link>
                <Link
                  href="/method/"
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'lg',
                  })}
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

      <Section spacing="tight" divider="bottom">
        <Stack gap="lg">
          <Grid gap="lg">
            {STEPS.map(([kicker, title, body], i) => (
              <GridItem span={12} mdSpan={4} key={kicker}>
                <Stack gap="xs">
                  <Typography variant="ui-sm" tone="primary">
                    {i + 1} · {kicker}
                  </Typography>
                  <Typography as="h2" variant="h3">
                    {title}
                  </Typography>
                  <Typography tone="muted">{body}</Typography>
                </Stack>
              </GridItem>
            ))}
          </Grid>
        </Stack>
      </Section>

      <Section spacing="tight">
        <Stack gap="lg">
          <Stack gap="sm">
            <StatGroup
              cols={3}
              layout="value-first"
              stats={[
                {
                  value: n.verified,
                  label: 'answers checked by a second reader',
                },
                { value: n.quotes, label: 'source quotes you can check' },
                { value: n.cards, label: 'questions we are working on' },
              ]}
            />
            <Typography variant="ui" tone="muted">
              An answer is published in full only after someone who did not
              write it has tried to break it. The rest are still being checked,
              and each one says so.
            </Typography>
          </Stack>
          <Stack gap="sm">
            <Typography as="h2" variant="h2" id="where-we-stand">
              Where we stand
            </Typography>
            {/* Built by export.py from docs/chapters.md, every character escaped before any tag is added. */}
            <Prose
              variant="long"
              dangerouslySetInnerHTML={{ __html: site.standing }}
            />
          </Stack>
        </Stack>
      </Section>
    </>
  );
}
