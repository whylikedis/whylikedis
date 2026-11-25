import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyOf } from '../engine/events.ts';
import { createPersisted, memoryStorage } from './persisted.ts';
import {
  fromV1,
  LEGACY_PROGRESS_KEY,
  PLAYER_KEY,
  playerStore,
  validatePlayer,
  WWYS,
  type PlayerDoc,
} from './player.ts';

type Doc = { version: 3; n: number };
const opts = (
  storage: ReturnType<typeof memoryStorage>,
  errors: string[] = [],
) => ({
  storage,
  key: 'k',
  version: 3 as const,
  empty: (): Doc => ({ version: 3, n: 0 }),
  migrations: {
    1: (v: any) => ({ version: 2, count: v.c }),
    2: (v: any) => ({ version: 3, n: v.count }),
  },
  validate: (v: any): Doc | null =>
    v?.version === 3 && typeof v.n === 'number' ? v : null,
  onError: (_e: unknown, where: string) => errors.push(where),
});

test('an old document walks through every migration in turn', async () => {
  const s = memoryStorage({ k: JSON.stringify({ version: 1, c: 7 }) });
  const r = await createPersisted(opts(s)).load();
  assert.deepEqual(r, { value: { version: 3, n: 7 }, source: 'migrated' });
});

test('nothing stored gives empty; a current document loads as stored', async () => {
  assert.equal(
    (await createPersisted(opts(memoryStorage())).load()).source,
    'empty',
  );
  const s = memoryStorage({ k: JSON.stringify({ version: 3, n: 2 }) });
  assert.deepEqual(await createPersisted(opts(s)).load(), {
    value: { version: 3, n: 2 },
    source: 'stored',
  });
});

test('an unreadable document is set aside, never lost, and the app starts fresh', async () => {
  for (const raw of [
    '{not json',
    JSON.stringify({ version: 9, n: 1 }),
    JSON.stringify({ version: 3, n: 'x' }),
  ]) {
    const s = memoryStorage({ k: raw });
    const r = await createPersisted(opts(s)).load();
    assert.deepEqual(r, { value: { version: 3, n: 0 }, source: 'unreadable' });
    assert.equal(s.data.get('k.unreadable'), raw);
  }
});

test('a migration that throws is reported, and the document is set aside', async () => {
  const s = memoryStorage({ k: JSON.stringify({ version: 1 }) });
  const errors: string[] = [];
  const o = opts(s, errors);
  o.migrations[1] = () => {
    throw new Error('bad');
  };
  assert.equal((await createPersisted(o).load()).source, 'unreadable');
  assert.deepEqual(errors, ['migrate k']);
});

test('a burst of saves writes at most twice, and the last value wins', async () => {
  const s = memoryStorage();
  const p = createPersisted(opts(s));
  const saves = [1, 2, 3, 4, 5].map((n) => p.save({ version: 3, n }));
  await Promise.all(saves);
  assert.ok(s.writes <= 2, `wrote ${s.writes} times`);
  assert.equal(JSON.parse(s.data.get('k')!).n, 5);
});

test('a failed write is reported and does not stop the next one', async () => {
  const s = memoryStorage();
  const errors: string[] = [];
  let fail = true;
  const flaky = {
    getItem: s.getItem,
    setItem: async (k: string, v: string) => {
      if (fail) {
        fail = false;
        throw new Error('disk full');
      }
      return s.setItem(k, v);
    },
  };
  const p = createPersisted({ ...opts(s, errors), storage: flaky });
  await p.save({ version: 3, n: 1 });
  await p.save({ version: 3, n: 2 });
  assert.deepEqual(errors, ['write k']);
  assert.equal(JSON.parse(s.data.get('k')!).n, 2);
});

test("the first app build's progress carries over: streak days and practice order", async () => {
  const v1 = {
    version: 1,
    played: ['2026-11-25', '2026-11-26', 7],
    ratings: {
      a: { rating: 'had-it', day: '2026-11-25' },
      b: { rating: 'not-yet', day: '2026-11-26' },
      broken: { rating: 'had-it' },
    },
  };
  const s = memoryStorage({ [LEGACY_PROGRESS_KEY]: JSON.stringify(v1) });
  const r = await playerStore(s).load();
  assert.equal(r.source, 'migrated');
  const h = historyOf(r.value.events);
  assert.deepEqual(h.playedDays(WWYS, 'daily'), ['2026-11-25', '2026-11-26']);
  assert.deepEqual(h.lastScore(WWYS, 'a'), { points: 1, max: 1 });
  assert.deepEqual(h.lastScore(WWYS, 'b'), { points: 0, max: 1 });
  assert.equal(h.lastScore(WWYS, 'broken'), undefined);
  assert.equal(r.value.events.length, 4);
});

test('the player document prefers the new key over the legacy one', async () => {
  const doc: PlayerDoc = { version: 2, device: 'd1', events: [] };
  const s = memoryStorage({
    [PLAYER_KEY]: JSON.stringify(doc),
    [LEGACY_PROGRESS_KEY]: JSON.stringify({
      version: 1,
      played: ['2026-11-25'],
      ratings: {},
    }),
  });
  assert.deepEqual(await playerStore(s).load(), {
    value: doc,
    source: 'stored',
  });
});

test('one damaged event is dropped, not the whole history', () => {
  const good = fromV1({ played: ['2026-11-25'], ratings: {} }).events[0];
  const v = validatePlayer({
    version: 2,
    device: 'd',
    events: [good, { junk: true }],
  });
  assert.equal(v?.events.length, 1);
  assert.equal(validatePlayer({ version: 2, events: [] }), null);
  assert.equal(validatePlayer('x'), null);
});
