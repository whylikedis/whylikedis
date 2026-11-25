import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../interlace/daily.ts';
import type { GameEvent } from '../engine/events.ts';
import { milestoneLine, progressBetween } from './round.ts';

let n = 0;
const daily = (day: string): GameEvent[] => [
  {
    kind: 'answer',
    id: `a${n++}`,
    game: 'what-would-you-say',
    mode: 'daily',
    day,
    at: n,
    item: `c${day}`,
    score: { points: 1, max: 1 },
  },
  {
    kind: 'round',
    id: `r${n++}`,
    game: 'what-would-you-say',
    mode: 'daily',
    day,
    at: n,
    items: 1,
    score: { points: 1, max: 1 },
  },
];
const practice = (day: string, items: number): GameEvent[] => [
  ...Array.from({ length: items }, (_, i) => ({
    kind: 'answer' as const,
    id: `p${n++}`,
    game: 'what-would-you-say',
    mode: 'practice',
    day,
    at: n,
    item: `p${i}`,
    score: { points: 0, max: 1 },
  })),
  {
    kind: 'round',
    id: `pr${n++}`,
    game: 'what-would-you-say',
    mode: 'practice',
    day,
    at: n,
    items,
    score: { points: 0, max: items },
  },
];
const days = (from: string, count: number) =>
  Array.from({ length: count }, (_, i) => addDays(from, i)).flatMap(daily);

const TODAY = '2026-11-25';

test('the seventh day in a row passes a milestone and says so', () => {
  const before = days('2026-11-19', 6);
  const after = [...before, ...daily(TODAY)];
  const p = progressBetween(before, after, TODAY, undefined);
  assert.equal(p.xp.gained, 10);
  assert.equal(p.xp.total, 70);
  assert.equal(p.streak.current, 7);
  assert.equal(p.streak.extended, true);
  assert.deepEqual(p.milestones, [7]);
  assert.equal(p.highlight, milestoneLine(7));
  assert.equal(p.streak.shields, 1);
  assert.equal(p.goal.metNow, true);
});

test('a practice round earns XP, meets a bigger goal, and leaves the streak alone', () => {
  const before = daily(TODAY);
  const after = [...before, ...practice(TODAY, 5)];
  const p = progressBetween(before, after, TODAY, 'steady');
  assert.equal(p.xp.gained, 30);
  assert.equal(p.goal.earned, 40);
  assert.equal(p.goal.earnedBefore, 10);
  assert.equal(p.goal.metNow, true);
  assert.equal(p.streak.extended, false);
  assert.deepEqual(p.milestones, []);
  // 40 XP is still level 1 of 100.
  assert.equal(p.highlight, 'Daily goal met.');
});

test('a level reached comes before a goal met', () => {
  const before = days('2026-11-10', 9).filter((e) => e.day !== '2026-11-12');
  const after = [...before, ...practice(TODAY, 5)];
  const p = progressBetween(before, after, TODAY, 'keen');
  assert.equal(p.xp.levelsUp, 1);
  assert.equal(p.highlight, 'You reached level 2.');
});

test('nothing new says nothing', () => {
  const log = daily(TODAY);
  const p = progressBetween(log, log, TODAY, 'keen');
  assert.equal(p.xp.gained, 0);
  assert.equal(p.highlight, undefined);
  assert.equal(p.goal.met, false);
});

test('a shield earned outside a milestone is the news', () => {
  // Fourteen days earn two shields; a missed day spends one; the 21st day of the run earns it back.
  const before = [...days('2026-11-04', 14), ...days('2026-11-19', 6)];
  const after = [...before, ...daily(TODAY)];
  const p = progressBetween(before, after, TODAY, undefined);
  assert.equal(p.streak.current, 21);
  assert.equal(p.streak.shieldsUsed, 1);
  assert.equal(p.streak.shieldEarned, true);
  assert.deepEqual(p.milestones, []);
  assert.equal(
    p.highlight,
    'You earned a streak shield. It covers one day you miss.',
  );
  assert.match(milestoneLine(4), /Well kept/);
});
