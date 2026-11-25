import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG } from './catalog.ts';

test('the catalog has unique ids and at least one live game', () => {
  assert.equal(new Set(CATALOG.map((g) => g.id)).size, CATALOG.length);
  assert.ok(CATALOG.some((g) => g.status === 'live'));
});

test('labels read as English', async () => {
  const { listOf, streakLabel } = await import('./labels.ts');
  assert.deepEqual([0, 1, 2].map(streakLabel), [
    'Play today to start a streak',
    '1 day in a row',
    '2 days in a row',
  ]);
  assert.equal(listOf(['A']), 'A');
  assert.equal(listOf(['A', 'B', 'C']), 'A, B and C');
});
