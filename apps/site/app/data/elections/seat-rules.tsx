'use client';

import { useMemo, useState } from 'react';
import { SeatChart } from '@/components/ui/charts/seat-chart';
import { SimpleSlider } from '@/components/ui/slider';
import { Cluster, Stack } from '@/components/ui/stack';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';

type List = { letters: string; name: string; votes: number; seats: number };
type Year = { year: string; lists: List[] };

const SEATS = 120;
const THRESHOLD = 3.25; // per cent of valid votes, since 2015
const n = (x: number) => x.toLocaleString('en-US');

// The count the law describes, without surplus-vote agreements: lists under the threshold drop
// out, the rest share 120 seats by the highest average (each list's votes over its seats plus one).
export function share(lists: List[], thresholdPct: number) {
  const total = lists.reduce((s, l) => s + l.votes, 0);
  const passed = lists.filter((l) => l.votes >= (total * thresholdPct) / 100);
  const seats = new Map(passed.map((l) => [l.letters, 0]));
  for (let i = 0; i < SEATS && passed.length; i++) {
    const next = passed.reduce((a, b) =>
      b.votes / (seats.get(b.letters)! + 1) >
      a.votes / (seats.get(a.letters)! + 1)
        ? b
        : a,
    );
    seats.set(next.letters, seats.get(next.letters)! + 1);
  }
  const counted = passed.reduce((s, l) => s + l.votes, 0);
  return {
    passed: passed.map((l) => ({ ...l, won: seats.get(l.letters)! })),
    lost: total - counted,
    out: lists.length - passed.length,
    price: passed.length ? counted / SEATS : 0,
    total,
  };
}

export function SeatRules({ years }: { years: Year[] }) {
  const [year, setYear] = useState(years[0].year);
  const [pct, setPct] = useState(THRESHOLD);
  const lists = years.find((y) => y.year === year)!.lists;
  const r = useMemo(() => share(lists, pct), [lists, pct]);
  const real = pct === THRESHOLD;
  const moved = real
    ? r.passed.reduce((s, l) => s + Math.max(0, l.won - l.seats), 0)
    : 0;
  return (
    <Stack gap="lg">
      <Cluster gap="lg" align="end">
        <Tabs value={year} onValueChange={(v) => setYear(String(v))}>
          <TabsList aria-label="Election">
            {years.map((y) => (
              <TabsTrigger key={y.year} value={y.year}>
                {y.year}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Stack gap="xs">
          <Typography as="p" variant="ui-sm" tone="muted">
            Threshold: {pct.toFixed(2)}% of valid votes
            {real ? ' (the real one)' : ''}
          </Typography>
          <SimpleSlider
            label="Threshold, per cent of valid votes"
            min={1}
            max={6}
            step={0.25}
            value={[pct]}
            onValueChange={(v) => setPct(Array.isArray(v) ? v[0] : v)}
          />
        </Stack>
      </Cluster>
      <Typography as="p" variant="long" aria-live="polite">
        {r.passed.length} lists pass and share the {SEATS} seats. A seat costs
        about {n(Math.round(r.price))} votes. {r.out} lists fall below the line,
        and their {n(r.lost)} votes ({((r.lost / r.total) * 100).toFixed(1)}%)
        elect no one.
      </Typography>
      <SeatChart
        label={`${year}, with a ${pct.toFixed(2)}% threshold`}
        groups={r.passed
          .toSorted((a, b) => b.won - a.won)
          .map((l) => ({ label: l.name, seats: l.won }))}
        total={SEATS}
        majority={61}
      />
      {real && moved > 0 && (
        <Typography as="p" variant="ui-sm" tone="muted">
          This simple count differs from the official result by {moved}{' '}
          {moved === 1 ? 'seat' : 'seats'}. The difference comes from
          surplus-vote agreements: two lists that sign one are counted as a
          single list when the last seats are shared out.
        </Typography>
      )}
    </Stack>
  );
}
