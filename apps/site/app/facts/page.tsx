import { Badge } from '@/components/ui/badge';
import { StatGroup } from '@/components/ui/patterns/stat-group';
import { Card as Panel, CardContent } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { searchItems } from '../answer-parts';
import { HeardSearch } from '../heard-search';
import { FACTS_DESCRIPTION, FACTS_TITLE } from './copy';
import { shareOf } from '../share-cards';
import { pageMeta } from '@/lib/share-image';
import { Stack } from '@/components/ui/stack';
import { TagList } from '@/components/ui/tag';
import { Typography } from '@/components/ui/typography';
import { ClaimCard } from '@/components/ui/patterns/claim-card';
import {
  type Card,
  PREVIEW,
  type Round,
  type Source,
  counts,
  site,
} from '../data';

export const metadata = pageMeta({
  title: 'Fact base',
  description: FACTS_DESCRIPTION,
  path: '/facts/',
  share: shareOf('facts'),
});

// The gate allows only https links. This is the same rule at the last step before a reader's click.
const safe = (url: string) => (url.startsWith('https://') ? url : undefined);

const Sources = ({ list }: { list: Source[] }) => (
  <ul>
    {list.map((s, i) => (
      <li key={i}>
        <a href={safe(s.url)} rel="noopener noreferrer">
          {s.publisher}
        </a>{' '}
        ({s.kind}
        {s.wire ? `, ${s.wire} copy` : ''})<blockquote>{s.quote}</blockquote>
      </li>
    ))}
  </ul>
);

const Plain = ({ items }: { items: string[] }) => (
  <ul>
    {items.length ? (
      items.map((x, i) => <li key={i}>{x}</li>)
    ) : (
      <li>Nothing recorded.</li>
    )}
  </ul>
);

const ROUNDS = [
  ['skeptic', 'attack round'],
  ['citer', 'citation round'],
] as const;

// Several cards can answer one claim from different angles. The list names each claim once.
const unique = (cards: Card[]) => [...new Set(cards.map((c) => c.claim))];

function CardView({ c }: { c: Card }) {
  const rounds = ROUNDS.flatMap(([who, label]): [string, Round][] => {
    const r = c.review?.[who];
    return r ? [[label, r]] : [];
  });
  return (
    <ClaimCard id={c.id}>
      <ClaimCard.Status>
        {c.status === 'verified' ? (
          <Badge variant="success">Checked by a second reader</Badge>
        ) : (
          <Badge variant="outline">Still being checked</Badge>
        )}
        {rounds.map(([label, r]) =>
          r.verdict ? (
            <Badge
              variant={r.verdict === 'holds' ? 'outline' : 'warning'}
              key={label}
            >
              {label}: {r.verdict}
            </Badge>
          ) : null,
        )}
        {!c.content_approved && (
          <Badge variant="outline">Not yet approved for teaching</Badge>
        )}
      </ClaimCard.Status>
      {c.status === 'verified' ? (
        <ViewTransition name={`claim-${c.id}`}>
          <ClaimCard.Claim>{c.claim}</ClaimCard.Claim>
        </ViewTransition>
      ) : (
        <ClaimCard.Claim>{c.claim}</ClaimCard.Claim>
      )}
      <ClaimCard.Answer>{c.answer}</ClaimCard.Answer>
      <ClaimCard.Section
        title="Facts and sources"
        meta={`${c.facts.filter((f) => f.enough).length} of ${c.facts.length} fully sourced`}
      >
        <Prose>
          <ol>
            {c.facts.map((f, i) => (
              <li key={i}>
                {f.text}{' '}
                {f.record && (
                  <Badge variant="outline">what a record says</Badge>
                )}{' '}
                {!f.enough && <Badge variant="warning">short of sources</Badge>}
                <Sources list={f.sources} />
              </li>
            ))}
          </ol>
        </Prose>
      </ClaimCard.Section>
      <ClaimCard.Section title="Who says this" meta={c.heard.length}>
        <Prose>
          <ul>
            {c.heard.map((h, i) => (
              <li key={i}>
                {h.who}:{' '}
                <a href={safe(h.url)} rel="noopener noreferrer">
                  source
                </a>
                <blockquote>{h.quote}</blockquote>
              </li>
            ))}
          </ul>
        </Prose>
      </ClaimCard.Section>
      <ClaimCard.Section
        title="Where the record is contested"
        meta={c.contested.length}
      >
        <Prose>
          <ul>
            {c.contested.length ? (
              c.contested.map((x, i) =>
                typeof x === 'string' ? (
                  <li key={i}>{x}</li>
                ) : (
                  <li key={i}>
                    {x.text}
                    <Sources list={x.sources ?? []} />
                  </li>
                ),
              )
            ) : (
              <li>Nothing recorded.</li>
            )}
          </ul>
        </Prose>
      </ClaimCard.Section>
      <ClaimCard.Section title="What this card does not claim">
        <Prose>
          <Plain items={c.not_claimed} />
        </Prose>
      </ClaimCard.Section>
      <ClaimCard.Section
        title="What we could not verify"
        meta={c.could_not_verify?.length ?? 0}
      >
        <Prose>
          <Plain items={c.could_not_verify ?? []} />
        </Prose>
      </ClaimCard.Section>
      {rounds.length > 0 && (
        <ClaimCard.Section title="Review notes">
          <Prose>
            {rounds.map(([label, r]) => (
              <p key={label}>
                <b>{label[0].toUpperCase() + label.slice(1)}.</b> {r.notes}
              </p>
            ))}
          </Prose>
        </ClaimCard.Section>
      )}
      <ClaimCard.Footer>
        {c.status === 'verified' && (
          <Link href={`/answers/${c.id}/`}>Open the answer page</Link>
        )}{' '}
        Card <code>{c.id}</code>
      </ClaimCard.Footer>
    </ClaimCard>
  );
}

export default function Facts() {
  const n = counts();
  return (
    <Section container="wide" spacing="tight">
      <Stack gap="lg">
        <Stack gap="sm">
          <Typography variant="ui-sm" tone="primary">
            Answers
          </Typography>
          <Typography as="h1" variant="h1">
            {FACTS_TITLE}
          </Typography>
          <Typography variant="long" tone="muted">
            {FACTS_DESCRIPTION}
          </Typography>
          <HeardSearch items={searchItems()} />
        </Stack>
        <StatGroup
          cols={3}
          layout="value-first"
          surface="plain"
          stats={[
            { value: n.verified, label: 'checked by a second reader' },
            { value: n.cards - n.verified, label: 'still being checked' },
            { value: n.approved, label: 'approved for teaching' },
          ]}
        />
        <TagList
          items={site.chapters.map((ch) => ({
            href: `#ch${ch.n}`,
            label: `${ch.n}. ${ch.title}`,
          }))}
        />
        {site.chapters.map((ch) => {
          const mine = site.cards.filter((c) => c.era === ch.n);
          // The hosted site shows a card in full only once it is verified; drafts are listed by their
          // claim, so nobody mistakes an unreviewed answer for a checked one.
          const full = mine.filter((c) => PREVIEW || c.status === 'verified');
          const drafts = mine.filter((c) => !full.includes(c));
          return (
            <Stack gap="md" render={<section />} key={ch.n}>
              <Typography as="h2" variant="h2" id={`ch${ch.n}`}>
                {ch.n}. {ch.title}
              </Typography>
              {full.map((c) => (
                <CardView c={c} key={c.id} />
              ))}
              {drafts.length > 0 && (
                <Panel>
                  <CardContent>
                    <Stack gap="sm">
                      <div>
                        <Badge variant="outline">Still being checked</Badge>
                      </div>
                      <List marker="bullet">
                        {unique(drafts).map((claim) => (
                          <ListItem key={claim}>
                            <q>{claim}</q>
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </CardContent>
                </Panel>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Section>
  );
}
