import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyOf, type GameEvent } from '../engine/events.ts';
import { startSession, step, summarize } from '../engine/session.ts';
import {
  dailyCard,
  FIRST_DAY,
  PRACTICE_SIZE,
  practiceRound,
  whatWouldYouSay,
} from './what-would-you-say.ts';

const cards = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }));
const game = whatWouldYouSay<{ id: string }>();
const none = historyOf([]);

test('the daily card is the same for everyone on a day, and none repeats within a cycle', () => {
  assert.equal(
    dailyCard(cards, FIRST_DAY)?.id,
    dailyCard([...cards], FIRST_DAY)?.id,
  );
  const days = Array.from({ length: cards.length }, (_, i) =>
    new Date(Date.UTC(2026, 10, 25 + i)).toISOString().slice(0, 10),
  );
  assert.equal(
    new Set(days.map((d) => dailyCard(cards, d)?.id)).size,
    cards.length,
  );
  assert.equal(dailyCard(cards, '2026-01-01'), undefined); // before the game began
  assert.equal(dailyCard([], FIRST_DAY), undefined);
});

test('practice puts the cards not yet known first', () => {
  const known: GameEvent[] = ['a', 'b', 'c', 'd', 'e'].map((item, i) => ({
    kind: 'answer',
    id: String(i),
    at: i,
    game: game.id,
    mode: 'practice',
    day: FIRST_DAY,
    item,
    score: { points: 1, max: 1 },
  }));
  const round = practiceRound(cards, historyOf(known), FIRST_DAY);
  assert.equal(round.length, PRACTICE_SIZE);
  assert.deepEqual(
    round
      .slice(0, 2)
      .map((c) => c.id)
      .sort(),
    ['f', 'g'],
  );
  // Same day, same round; another day, a new order.
  assert.deepEqual(
    practiceRound(cards, none, FIRST_DAY),
    practiceRound(cards, none, FIRST_DAY),
  );
});

test('the game deals one card daily and five in practice, and scores honestly', () => {
  const [daily, practice] = game.modes;
  const ctx = { content: cards, history: none, day: FIRST_DAY };
  assert.equal(game.deal({ ...ctx, mode: daily }).length, 1);
  assert.equal(game.deal({ ...ctx, mode: practice }).length, PRACTICE_SIZE);
  assert.equal(game.deal({ ...ctx, day: '2026-01-01', mode: daily }).length, 0);

  let s = startSession(game, practice, game.deal({ ...ctx, mode: practice }));
  for (const r of ['had-it', 'not-yet', 'had-it', 'had-it', 'not-yet'] as const)
    s = step(game, s, { type: 'answer', answer: r });
  assert.deepEqual(summarize(s), {
    points: 3,
    max: 5,
    answered: 5,
    perfect: false,
  });
});
