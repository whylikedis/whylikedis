import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dailyCard,
  EMPTY,
  FIRST_DAY,
  parseProgress,
  practiceRound,
  record,
} from './game-model.ts';

const cards = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }));

test('the daily card is the same for everyone on a day, and none repeats within a cycle', () => {
  assert.equal(
    dailyCard(cards, FIRST_DAY)?.id,
    dailyCard([...cards], FIRST_DAY)?.id,
  );
  const days = Array.from({ length: cards.length }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 25 + i));
    return d.toISOString().slice(0, 10);
  });
  const ids = days.map((d) => dailyCard(cards, d)?.id);
  assert.equal(new Set(ids).size, cards.length);
  assert.equal(dailyCard(cards, '2026-01-01'), undefined); // before the game began
  assert.equal(dailyCard([], FIRST_DAY), undefined);
});

test('practice puts the cards not yet known first', () => {
  let p = EMPTY;
  for (const c of cards.slice(0, 5))
    p = record(p, c.id, 'had-it', FIRST_DAY, false);
  const round = practiceRound(cards, p, FIRST_DAY, 2);
  assert.deepEqual(new Set(round.map((c) => c.id)), new Set(['f', 'g']));
  assert.equal(practiceRound(cards, EMPTY, FIRST_DAY).length, 5);
  assert.deepEqual(
    practiceRound(cards, EMPTY, FIRST_DAY),
    practiceRound(cards, EMPTY, FIRST_DAY),
  );
});

test('only the daily game marks a day played, once', () => {
  let p = record(EMPTY, 'a', 'not-yet', FIRST_DAY, false);
  assert.deepEqual(p.played, []);
  p = record(p, 'a', 'had-it', FIRST_DAY, true);
  p = record(p, 'b', 'had-it', FIRST_DAY, true);
  assert.deepEqual(p.played, [FIRST_DAY]);
  assert.equal(p.ratings.a.rating, 'had-it');
});

test('stored progress is trusted only when it has the right shape', () => {
  assert.equal(parseProgress(null), EMPTY);
  assert.equal(parseProgress('{not json'), EMPTY);
  assert.equal(parseProgress('{"version":2}'), EMPTY);
  assert.equal(
    parseProgress('{"version":1,"played":[],"ratings":null}'),
    EMPTY,
  );
  const p = parseProgress(
    '{"version":1,"played":["2026-11-25",4],"ratings":{}}',
  );
  assert.deepEqual(p.played, ['2026-11-25']);
});
