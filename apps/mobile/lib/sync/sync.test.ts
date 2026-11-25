import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventId, type GameEvent } from '../engine/events.ts';
import { validatePlayer } from '../store/player.ts';
import {
  CLOCK_SLACK_MS,
  memoryRemote,
  NEVER_SYNCED,
  outbox,
  syncOnce,
  type SyncState,
} from './sync.ts';

const answer = (device: string, at: number, item = 'a'): GameEvent => ({
  kind: 'answer',
  id: eventId(device, at),
  game: 'g',
  mode: 'practice',
  day: '2026-11-25',
  at,
  item,
  score: { points: 1, max: 1 },
});

type Device = { id: string; events: GameEvent[]; state: SyncState };
const device = (id: string): Device => ({
  id,
  events: [],
  state: NEVER_SYNCED,
});
async function sync(d: Device, remote: ReturnType<typeof memoryRemote>) {
  const r = await syncOnce(d.events, d.id, d.state, remote);
  d.events = r.events;
  d.state = r.state;
  return r;
}
const ids = (d: Device) => d.events.map((e) => e.id);

test('two devices that played offline end with the same log, in any sync order', async () => {
  const remote = memoryRemote();
  const phone = device('phone');
  const tablet = device('tablet');
  phone.events.push(answer('phone', 1000), answer('phone', 3000));
  tablet.events.push(answer('tablet', 2000));

  await sync(phone, remote);
  await sync(tablet, remote);
  await sync(phone, remote);

  assert.deepEqual(ids(phone), ids(tablet));
  assert.equal(phone.events.length, 3);
  assert.deepEqual(
    phone.events.map((e) => e.at),
    [1000, 2000, 3000],
  );
});

test('syncing again with nothing new sends nothing and changes nothing', async () => {
  const remote = memoryRemote();
  const phone = device('phone');
  phone.events.push(answer('phone', 1000));
  await sync(phone, remote);
  const before = ids(phone);
  const r = await sync(phone, remote);
  assert.equal(r.pulled, 0);
  assert.deepEqual(ids(phone), before);
  assert.equal(remote.log.length, 1);
});

test('a failed push or pull changes nothing, and the next try catches up', async () => {
  const remote = memoryRemote();
  const phone = device('phone');
  phone.events.push(answer('phone', 1000));

  remote.failNext = 'push';
  await assert.rejects(sync(phone, remote));
  assert.deepEqual(phone.state, NEVER_SYNCED);

  remote.failNext = 'pull';
  await assert.rejects(sync(phone, remote));
  assert.deepEqual(phone.state, NEVER_SYNCED); // pushed, but not confirmed locally

  await sync(phone, remote);
  assert.equal(remote.log.length, 1); // the repeat push was ignored by id
  assert.equal(phone.state.pushedAt, 1000);
});

test("only this device's new events go out, with slack for a clock that moved back", () => {
  const events = [
    answer('phone', 10 * 60_000),
    answer('tablet', 20 * 60_000),
    answer('phone', 30 * 60_000),
  ];
  const state = { cursor: '1', pushedAt: 30 * 60_000 };
  assert.equal(outbox(events, 'phone', NEVER_SYNCED).length, 2);
  assert.deepEqual(
    outbox(events, 'phone', state).map((e) => e.at),
    [30 * 60_000],
  );
  // An event stamped a little before the last push (the clock moved back) still goes out.
  const late = answer('phone', 30 * 60_000 - CLOCK_SLACK_MS / 2);
  assert.ok(outbox([...events, late], 'phone', state).includes(late));
});

test('records the app cannot read are skipped and counted, never merged', async () => {
  const remote = memoryRemote();
  remote.log.push({ id: 'junk' } as unknown as GameEvent, answer('tablet', 5));
  const phone = device('phone');
  const r = await sync(phone, remote);
  assert.equal(r.skipped, 1);
  assert.equal(r.pulled, 1);
  assert.equal(phone.events.length, 1);
});

test('the sync state and seen updates survive a save and load, and bad ones are dropped', () => {
  const doc = validatePlayer({
    version: 2,
    device: 'd',
    events: [],
    sync: { cursor: '4', pushedAt: 9 },
    seenUpdates: ['answer:a', 3],
  });
  assert.deepEqual(doc?.sync, { cursor: '4', pushedAt: 9 });
  assert.deepEqual(doc?.seenUpdates, ['answer:a']);
  const bad = validatePlayer({
    version: 2,
    device: 'd',
    events: [],
    sync: { cursor: 4 },
  });
  assert.equal(bad?.sync, undefined);
});
