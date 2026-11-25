import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  eventId,
  historyOf,
  isGameEvent,
  mergeEvents,
  type GameEvent,
} from './events.ts';
import { currentItem, startSession, step, summarize } from './session.ts';
import type { Game } from './types.ts';

const game: Game<{ id: string }, boolean, readonly { id: string }[]> = {
  id: 'g',
  modes: [{ id: 'm', daily: false }],
  deal: ({ content }) => [...content],
  judge: (_i, right) => ({ points: right ? 1 : 0, max: 1 }),
};
const mode = game.modes[0];
const items = [{ id: 'a' }, { id: 'b' }];

test('a session moves question, revealed, next question, then done', () => {
  let s = startSession(game, mode, items);
  assert.equal(s.phase, 'question');
  assert.equal(currentItem(s)?.id, 'a');
  s = step(game, s, { type: 'reveal' });
  assert.equal(s.phase, 'revealed');
  s = step(game, s, { type: 'answer', answer: true });
  assert.equal(s.phase, 'question');
  assert.equal(currentItem(s)?.id, 'b');
  s = step(game, s, { type: 'answer', answer: false });
  assert.equal(s.phase, 'done');
  assert.equal(currentItem(s), undefined);
  assert.deepEqual(summarize(s), {
    points: 1,
    max: 2,
    answered: 2,
    perfect: false,
  });
});

test('an action that does not fit the phase changes nothing, by identity', () => {
  let s = startSession(game, mode, items);
  s = step(game, s, { type: 'reveal' });
  assert.equal(step(game, s, { type: 'reveal' }), s); // a double tap
  const done = step(game, step(game, s, { type: 'answer', answer: true }), {
    type: 'answer',
    answer: true,
  });
  assert.equal(step(game, done, { type: 'answer', answer: true }), done); // past the end
  assert.equal(done.answered.length, 2);
});

test('an empty round starts done, and its summary is not perfect', () => {
  const s = startSession(game, mode, []);
  assert.equal(s.phase, 'done');
  assert.equal(summarize(s).perfect, false);
});

const ev = (over: Partial<GameEvent> & { id: string; at: number }): GameEvent =>
  ({
    kind: 'answer',
    game: 'g',
    mode: 'm',
    day: '2026-11-25',
    item: 'a',
    score: { points: 1, max: 1 },
    ...over,
  }) as GameEvent;

test('merging logs is order-free and idempotent', () => {
  const a = [ev({ id: '1', at: 1 }), ev({ id: '3', at: 3 })];
  const b = [ev({ id: '2', at: 2 }), ev({ id: '3', at: 3 })];
  const ab = mergeEvents(a, b);
  assert.deepEqual(
    ab.map((e) => e.id),
    ['1', '2', '3'],
  );
  assert.deepEqual(mergeEvents(b, a), ab);
  assert.deepEqual(mergeEvents(ab, ab), ab);
  assert.deepEqual(mergeEvents(mergeEvents(a, b), a), ab);
});

test('history gives the latest score per item and the days a mode was finished', () => {
  const h = historyOf([
    ev({ id: '1', at: 1, score: { points: 0, max: 1 } }),
    ev({ id: '2', at: 2, score: { points: 1, max: 1 } }),
    {
      kind: 'round',
      id: 'r2',
      at: 5,
      game: 'g',
      mode: 'daily',
      day: '2026-11-26',
      items: 1,
      score: { points: 1, max: 1 },
    },
    {
      kind: 'round',
      id: 'r1',
      at: 4,
      game: 'g',
      mode: 'daily',
      day: '2026-11-25',
      items: 1,
      score: { points: 1, max: 1 },
    },
    {
      kind: 'round',
      id: 'r3',
      at: 6,
      game: 'g',
      mode: 'daily',
      day: '2026-11-25',
      items: 1,
      score: { points: 0, max: 1 },
    },
  ]);
  assert.deepEqual(h.lastScore('g', 'a'), { points: 1, max: 1 });
  assert.equal(h.lastScore('g', 'zzz'), undefined);
  assert.equal(h.lastScore('other', 'a'), undefined);
  assert.deepEqual(h.playedDays('g', 'daily'), ['2026-11-25', '2026-11-26']);
  assert.deepEqual(h.playedDays('g', 'practice'), []);
});

test('only well-formed events of a known kind pass', () => {
  assert.ok(isGameEvent(ev({ id: '1', at: 1 })));
  assert.ok(!isGameEvent(null));
  assert.ok(
    !isGameEvent({ ...ev({ id: '1', at: 1 }), kind: 'from-a-newer-app' }),
  );
  assert.ok(!isGameEvent({ ...ev({ id: '1', at: 1 }), day: '2026-02-30' }));
  assert.ok(
    !isGameEvent({ ...ev({ id: '1', at: 1 }), score: { points: 'x', max: 1 } }),
  );
  assert.ok(!isGameEvent({ ...ev({ id: '1', at: 1 }), item: 3 }));
  assert.ok(
    !isGameEvent({
      kind: 'round',
      id: 'r',
      game: 'g',
      mode: 'm',
      day: '2026-11-25',
      at: 1,
      score: { points: 0, max: 0 },
    }),
  );
});

test('event ids from one device at one instant never collide', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => eventId('d', 42)));
  assert.equal(ids.size, 1000);
});
