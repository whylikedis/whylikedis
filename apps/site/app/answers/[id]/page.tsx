import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ViewTransition } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid, GridItem } from '@/components/ui/grid';
import { List } from '@/components/ui/list';
import { Citation } from '@/components/ui/patterns/citation';
import { Dialogue } from '@/components/ui/patterns/dialogue';
import { StatusPills } from '@/components/ui/patterns/status-pills';
import { Timeline } from '@/components/ui/patterns/timeline';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import {
  answerLines,
  chapterTitle,
  contestedText,
  quoteCount,
  record,
  shownCards,
} from '../../answer-parts';

// One page per answer the gate passed. A draft has no page on the hosted site (check.mjs proves it).
export const dynamicParams = false;
export const generateStaticParams = () =>
  shownCards().map((c) => ({ id: c.id }));

type Props = { params: Promise<{ id: string }> };
const find = async ({ params }: Props) => {
  const { id } = await params;
  return shownCards().find((c) => c.id === id)!;
};

export async function generateMetadata(props: Props) {
  const c = await find(props);
  return { title: c.claim, alternates: { canonical: `/answers/${c.id}/` } };
}

const safe = (url: string) => (url.startsWith('https://') ? url : undefined);

export default async function Answer(props: Props) {
  const c = await find(props);
  const lines = answerLines(c);
  const dated = record(c);
  const argued = contestedText(c);
  const others = shownCards().filter(
    (x) => x.id !== c.id && x.claim !== c.claim,
  );
  return (
    <>
      <Section container="wide" tone="brand" spacing="tight">
        <Stack gap="md">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/facts/">Answers</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  Chapter {c.era}: {chapterTitle(c)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Stack gap="xs">
            <Typography variant="ui-sm">Your kid heard</Typography>
            <ViewTransition name={`claim-${c.id}`}>
              <Typography as="h1" variant="h1">
                {c.claim}
              </Typography>
            </ViewTransition>
          </Stack>
          <StatusPills aria-label="About this answer">
            {c.status === 'verified' ? (
              <StatusPills.Item tone="ok">
                Checked by a second reader
              </StatusPills.Item>
            ) : (
              <StatusPills.Item>Still being checked</StatusPills.Item>
            )}
            <StatusPills.Item>{c.facts.length} facts</StatusPills.Item>
            <StatusPills.Item>{quoteCount(c)} sources quoted</StatusPills.Item>
            {!c.content_approved && (
              <StatusPills.Item>Not yet approved for teaching</StatusPills.Item>
            )}
          </StatusPills>
        </Stack>
      </Section>

      <Section container="wide" overlap="md" spacing="tight">
        <Grid gap="lg">
          <GridItem span={12} lgSpan={7}>
            <Stack gap="md">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Typography as="h2" variant="h3">
                      Say it straight
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <List marker="number" density="relaxed">
                    {lines.map((l, i) => (
                      <List.Item key={i}>
                        <Citation
                          marker="chip"
                          sources={l.sources}
                          chipLabel={l.chip}
                        >
                          {l.says}
                        </Citation>
                      </List.Item>
                    ))}
                  </List>
                </CardContent>
              </Card>
              {argued.length > 0 && (
                <Callout
                  tone="highlight"
                  kicker={
                    <span lang="he" dir="rtl">
                      דוגרי
                    </span>
                  }
                  title="Still argued"
                >
                  <List marker="bullet" density="compact">
                    {argued.map((t, i) => (
                      <List.Item key={i}>{t}</List.Item>
                    ))}
                  </List>
                </Callout>
              )}
            </Stack>
          </GridItem>
          <GridItem span={12} lgSpan={5}>
            <Stack gap="md">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Typography as="h2" variant="h4">
                      In their own words
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Prose width="fill">
                    {c.heard.map((h, i) => (
                      <figure key={i}>
                        <blockquote>{h.quote}</blockquote>
                        <figcaption>
                          {h.who}
                          {safe(h.url) && (
                            <>
                              {' '}
                              (
                              <a href={safe(h.url)} rel="noopener noreferrer">
                                source
                              </a>
                              )
                            </>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </Prose>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Typography as="h2" variant="h4">
                      What we're not saying
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <List marker="cross" density="compact">
                    {c.not_claimed.map((t, i) => (
                      <List.Item key={i}>{t}</List.Item>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Stack>
          </GridItem>
        </Grid>
      </Section>

      <Section container="wide" spacing="tight">
        <Grid gap="xl">
          {dated.length > 0 && (
            <GridItem span={12} lgSpan={5}>
              <Stack gap="md">
                <Stack gap="xs">
                  <Typography as="h2" variant="h2">
                    The record, in order
                  </Typography>
                  <Typography variant="long" tone="muted">
                    The documents behind the answer, by the year each one names,
                    quoted as the gate checked them.
                  </Typography>
                </Stack>
                <Timeline orientation="vertical">
                  {dated.map(({ year, source }, i) => (
                    <Timeline.Item
                      key={i}
                      date={year}
                      source={
                        safe(source.url) ? (
                          <a href={safe(source.url)} rel="noopener noreferrer">
                            {source.publisher}
                          </a>
                        ) : (
                          source.publisher
                        )
                      }
                    >
                      “{source.quote}”
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Stack>
            </GridItem>
          )}
          <GridItem span={12} lgSpan={dated.length > 0 ? 7 : 12} id="facts">
            <Stack gap="md">
              <Stack gap="xs">
                <Typography as="h2" variant="h2">
                  Every fact, and where it comes from
                </Typography>
                <Typography variant="long" tone="muted">
                  Open a fact to read the exact words each source uses, with a
                  link to the page.
                </Typography>
              </Stack>
              <Accordion multiple>
                {c.facts.map((f, i) => (
                  <AccordionItem value={`fact-${i}`} key={i}>
                    <AccordionTrigger>
                      {i + 1}. {f.text}
                    </AccordionTrigger>
                    <AccordionContent>
                      <List marker="bullet" density="default">
                        {f.sources.map((s, j) => (
                          <List.Item key={j}>
                            <Prose width="fill">
                              <p>
                                {safe(s.url) ? (
                                  <a
                                    href={safe(s.url)}
                                    rel="noopener noreferrer"
                                  >
                                    {s.publisher}
                                  </a>
                                ) : (
                                  s.publisher
                                )}{' '}
                                ({s.kind})
                              </p>
                              <blockquote>{s.quote}</blockquote>
                            </Prose>
                          </List.Item>
                        ))}
                      </List>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Stack>
          </GridItem>
        </Grid>
      </Section>

      <Section container="wide" spacing="tight" divider="top">
        <Stack gap="sm">
          <Typography as="h2" variant="h3">
            They might ask next
          </Typography>
          <Dialogue.Suggestions>
            {others.map((x) => (
              <ViewTransition name={`claim-${x.id}`} key={x.id}>
                <Dialogue.Suggestion asChild>
                  <Link href={`/answers/${x.id}/`}>{x.claim}</Link>
                </Dialogue.Suggestion>
              </ViewTransition>
            ))}
          </Dialogue.Suggestions>
        </Stack>
      </Section>
    </>
  );
}
