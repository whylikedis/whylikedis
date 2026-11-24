import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SeatChart, SeatChartCompare } from '@/components/ui/charts/seat-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid, GridItem } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/patterns/section-header';
import { StatGroup } from '@/components/ui/patterns/stat-group';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { site, type Election } from '../../data';
import { SeatRules } from './seat-rules';

export const metadata = {
  title: 'Israel’s Knesset elections, 2022 and 2026',
  description:
    'Official results of the 25th and 26th Knesset elections by town, checked against the national totals. Free to download.',
  alternates: { canonical: '/data/elections/' },
};

const n = (x: number) => x.toLocaleString('en-US');
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

// A dataset page: what the data is, where it came from, and the file. The analysis we did with it
// lives on its own page; this one takes no view.
export default function Elections() {
  const e = site.elections;
  const years = [e['2026'], e['2022']];
  return (
    <>
      <Section container="wide" spacing="tight">
        <Grid cols={12} gap="lg">
          <GridItem span={12} lgSpan={8}>
            <Stack gap="md">
              <Typography variant="ui-sm" tone="primary">
                Dataset
              </Typography>
              <Typography as="h1" variant="h1">
                Israel’s Knesset elections, 2022 and 2026
              </Typography>
              <Typography variant="long" tone="muted">
                The official results from the Central Elections Committee for
                every town, in one file you can open in a spreadsheet. We
                checked that each list’s total matches the committee’s national
                results.
              </Typography>
              <Cluster gap="md" align="center">
                <Button size="lg" render={<a href={e.csv.path} download />}>
                  Download the data
                </Button>
                <Button variant="link" render={<Link href="/election-map/" />}>
                  How we checked it
                </Button>
              </Cluster>
              <Typography as="p" variant="ui-sm" tone="muted">
                A CSV file, {mb(e.csv.bytes)}, for 2022 and 2026.
              </Typography>
            </Stack>
          </GridItem>
          <GridItem span={12} lgSpan={4}>
            <About e={e['2026']} older={e['2022']} rows={e.csv.rows} />
          </GridItem>
        </Grid>
      </Section>
      <Seats years={years} />
      <Rules />
      {years.map((y) => (
        <Results key={y.knesset} y={y} />
      ))}
    </>
  );
}

function About({
  e,
  older,
  rows,
}: {
  e: Election;
  older: Election;
  rows: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About this dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          <Stack gap="xs">
            <Typography as="p" variant="ui-sm" tone="muted">
              Source
            </Typography>
            <Typography as="p" variant="body">
              The Central Elections Committee’s files by town, for the{' '}
              {older.knesset}th and {e.knesset}th Knesset.
            </Typography>
          </Stack>
          <Stack gap="xs">
            <Typography as="p" variant="ui-sm" tone="muted">
              Coverage
            </Typography>
            <Typography as="p" variant="body">
              {n(e.towns)} towns and {n(e.stations)} polling stations in{' '}
              {e.date.slice(-4)}; {n(older.towns)} towns in{' '}
              {older.date.slice(-4)}.
            </Typography>
          </Stack>
          <Stack gap="xs">
            <Typography as="p" variant="ui-sm" tone="muted">
              Checked
            </Typography>
            <Typography as="p" variant="body">
              Every list’s total matches the committee’s national page.
            </Typography>
          </Stack>
          <Stack gap="xs">
            <Typography as="p" variant="ui-sm" tone="muted">
              Not placed
            </Typography>
            <Typography as="p" variant="body">
              Double-envelope votes (soldiers, diplomats, hospitals) have no
              town: {pct(e.double_envelope_share)} of votes in{' '}
              {e.date.slice(-4)}. They are in the file as town code 9999.
            </Typography>
          </Stack>
          <Stack gap="xs">
            <Typography as="p" variant="ui-sm" tone="muted">
              The file
            </Typography>
            <Typography as="p" variant="body">
              {n(rows)} rows: one per town and list. Town names are in Hebrew,
              as the committee writes them.
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Results({ y }: { y: Election }) {
  const seated = y.lists.filter((l) => l.seats > 0);
  const rest = y.lists.filter((l) => l.seats === 0);
  const restVotes = rest.reduce((s, l) => s + l.votes, 0);
  const year = y.date.slice(-4);
  return (
    <Section container="wide" spacing="comfortable" divider="top">
      <Stack gap="lg">
        <SectionHeader
          as="h2"
          align="start"
          eyebrow={`${y.knesset}th Knesset`}
          title={`The ${year} election, ${y.date}`}
          tagline={`${n(y.valid_votes)} valid votes for ${y.lists.length} lists. ${seated.length} lists passed the threshold and share the ${y.seats} seats.`}
        />
        <StatGroup
          cols={3}
          layout="value-first"
          stats={[
            { value: n(y.valid_votes), label: 'valid votes' },
            { value: seated.length, label: 'lists in the Knesset' },
            { value: y.seats, label: 'seats' },
          ]}
        />
        <Prose>
          <table>
            <caption>
              Votes and seats by list, {y.knesset}th Knesset ({year})
            </caption>
            <thead>
              <tr>
                <th scope="col">List</th>
                <th scope="col">Votes</th>
                <th scope="col">Share</th>
                <th scope="col">Seats</th>
              </tr>
            </thead>
            <tbody>
              {seated.map((l) => (
                <tr key={l.letters}>
                  <th scope="row">{l.name}</th>
                  <td>{n(l.votes)}</td>
                  <td>{pct(l.share)}</td>
                  <td>{l.seats}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{rest.length} other lists</th>
                <td>{n(restVotes)}</td>
                <td>{pct(restVotes / y.valid_votes)}</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </Prose>
      </Stack>
    </Section>
  );
}

const IDI = 'https://en.idi.org.il/articles/63750';

// The rules, then the same rules on the real votes: move the threshold and watch the seats move.
function Rules() {
  const e = site.elections;
  return (
    <Section container="wide" spacing="comfortable" tone="muted">
      <Stack gap="lg">
        <SectionHeader
          as="h2"
          align="start"
          eyebrow="How it works"
          title="How 120 seats are shared"
          tagline="Israel votes for party lists, not for local candidates. The whole country is one constituency."
        />
        <Grid cols={12} gap="md">
          {[
            [
              '1. The threshold',
              'A list needs at least 3.25% of the valid votes. Below that it wins no seats.',
            ],
            [
              '2. The price of a seat',
              'The votes of the lists that passed are divided by 120. Each list gets one seat for every full share.',
            ],
            [
              '3. The seats left over',
              'They go one at a time to the list with the most votes per seat, counting the next seat it would win.',
            ],
          ].map(([title, text]) => (
            <GridItem key={title} span={12} mdSpan={4}>
              <Card>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Typography variant="long">{text}</Typography>
                </CardContent>
              </Card>
            </GridItem>
          ))}
        </Grid>
        <Card>
          <CardContent>
            <SeatRules
              years={(['2026', '2022'] as const).map((y) => ({
                year: y,
                lists: e[y].lists,
              }))}
            />
          </CardContent>
        </Card>
        <Typography as="p" variant="ui-sm" tone="muted">
          The rules as the Israel Democracy Institute explains them in{' '}
          <a href={IDI} rel="noopener noreferrer">
            How Votes Become Knesset Seats
          </a>
          . The votes are the committee’s own.
        </Typography>
      </Stack>
    </Section>
  );
}

const MAJORITY = 61;

// The two Knessets side by side: every seat a dot, one colour per list, largest list first.
function Seats({ years }: { years: Election[] }) {
  return (
    <Section container="wide" spacing="comfortable" divider="top">
      <Stack gap="lg">
        <SectionHeader
          as="h2"
          align="start"
          eyebrow="The result"
          title="The Knesset, seat by seat"
          tagline="Each dot is one of the 120 seats, coloured by the list that won it. Hover over or tap a list to find its seats."
        />
        <SeatChartCompare>
          {years.map((y) => (
            <SeatChart
              key={y.knesset}
              label={`${y.date.slice(-4)}: the ${y.knesset}th Knesset`}
              groups={y.lists
                .filter((l) => l.seats > 0)
                .map((l) => ({ label: l.name, seats: l.seats }))}
              total={y.seats}
              majority={MAJORITY}
              tally="leaders"
            />
          ))}
        </SeatChartCompare>
      </Stack>
    </Section>
  );
}
