import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GameEvent } from '../engine/events.ts';
import { validatePlayer } from '../store/player.ts';
import {
  DAILY_XP,
  GOALS,
  goalXp,
  isGoalId,
  PRACTICE_XP,
  ROUND_BONUS_XP,
  xpEntries,
  xpGained,
} from './progress.ts';

let n = 0;
const answer = (
  mode: string,
  day: string,
  item: string,
  points = 1,
): GameEvent => ({
  kind: 'answer',
  id: `e${n++}`,
  game: 'what-would-you-say',
  mode,
  day,
  at: n,
  item,
  score: { points, max: 1 },
});
const round = (mode: string, day: string, items: number): GameEvent => ({
  kind: 'round',
  id: `e${n++}`,
  game: 'what-would-you-say',
  mode,
  day,
  at: n,
  items,
  score: { points: 0, max: items },
});

test('a daily question earns XP once a day, whatever the rating', () => {
  const log = [
    answer('daily', '2026-11-25', 'a', 0),
    round('daily', '2026-11-25', 1),
    answer('daily', '2026-11-25', 'a', 1),
    answer('daily', '2026-11-26', 'b', 1),
  ];
  assert.deepEqual(xpEntries(log), [
    { day: '2026-11-25', xp: DAILY_XP },
    { day: '2026-11-26', xp: DAILY_XP },
  ]);
});

test('practice earns per answer, and a finished round of three or more earns a bonus', () => {
  const log = [
    answer('practice', '2026-11-25', 'a', 0),
    answer('practice', '2026-11-25', 'a', 1),
    round('practice', '2026-11-25', 2),
    round('practice', '2026-11-25', 5),
  ];
  assert.deepEqual(
    xpEntries(log).map((e) => e.xp),
    [PRACTICE_XP, PRACTICE_XP, ROUND_BONUS_XP],
  );
});

test('the gain of a step is the difference in XP', () => {
  const before = [answer('daily', '2026-11-25', 'a')];
  const after = [
    ...before,
    answer('daily', '2026-11-25', 'a'),
    answer('practice', '2026-11-25', 'b'),
  ];
  assert.equal(xpGained(before, after), PRACTICE_XP);
  assert.equal(xpGained(after, before), 0);
});

test('goals: the light one is met by today’s question alone', () => {
  assert.equal(goalXp('light'), DAILY_XP);
  assert.equal(goalXp('keen'), 40);
  assert.equal(goalXp(undefined), GOALS[0].xp);
  assert.equal(goalXp('nope'), GOALS[0].xp);
  assert.ok(isGoalId('steady'));
  assert.ok(!isGoalId('huge'));
});

test('the player document keeps a valid goal and drops a bad one', () => {
  const base = { version: 2, device: 'd', events: [] };
  assert.equal(validatePlayer({ ...base, goal: 'keen' })?.goal, 'keen');
  assert.equal(validatePlayer({ ...base, goal: 'huge' })?.goal, undefined);
});
