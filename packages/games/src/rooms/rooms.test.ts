import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dealMatchReply,
  MATCH_POINTS,
  openingLine,
  readMatchPrompt,
  readMatchSolution,
  scoreMatch,
  scoreMatchRound,
  type ReplyCard,
} from './match-reply.ts';
import {
  realtimeRoomTransport,
  roomChannelNames,
  type ChannelLike,
} from './transport.ts';

const card = (
  id: string,
  claim = `claim ${id}`,
  verified = true,
): ReplyCard => ({
  id,
  claim,
  verified,
  lines: [
    {
      says: `Reply ${id}.`,
      sources: [{ publisher: 'P', url: `https://x.test/${id}` }],
    },
    {
      says: `More ${id}.`,
      sources: [{ publisher: 'P', url: `https://x.test/${id}` }],
    },
  ],
});

test('deals the same rounds for the same seed, never offering the answer twice', () => {
  const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id));
  const one = dealMatchReply(cards, 'K7Q4MZ');
  assert.deepEqual(one, dealMatchReply(cards, 'K7Q4MZ'));
  assert.notDeepEqual(
    one.map((r) => r.solution.correct),
    dealMatchReply(cards, 'ZZZZZZ').map((r) => r.solution.correct),
  );
  assert.equal(one.length, 5);
  for (const r of one) {
    assert.equal(r.prompt.choices.length, 4);
    assert.equal(new Set(r.prompt.choices.map((c) => c.id)).size, 4);
    assert.ok(r.prompt.choices.some((c) => c.id === r.solution.correct));
    assert.equal(r.solution.href, `/answers/${r.solution.correct}/`);
    assert.equal(r.solution.sources.length, 1); // the same url twice counts once
    assert.equal(JSON.stringify(r.prompt).includes('correct'), false);
  }
  assert.deepEqual(
    one.map((r) => r.prompt.round),
    [1, 2, 3, 4, 5],
  );
});

test('uses only verified cards with an answer, one per claim, and needs two', () => {
  const empty: ReplyCard = {
    id: 'x',
    claim: 'x',
    lines: [{ says: ' ', sources: [] }],
  };
  assert.equal(openingLine(empty), null);
  const cards = [card('a'), card('b', 'claim a'), card('c', 'c', false), empty];
  assert.deepEqual(dealMatchReply(cards, 's'), []);
  const two = dealMatchReply([...cards, card('d')], 's', {
    rounds: 9,
    choices: 9,
    seconds: 5,
  });
  assert.equal(two.length, 2);
  assert.equal(two[0]!.prompt.choices.length, 2);
  assert.equal(two[0]!.prompt.seconds, 5);
  assert.equal(
    dealMatchReply([card('a'), card('b'), card('c')], 's', {
      rounds: 1,
      choices: 1,
    })[0]!.prompt.choices.length,
    2,
  );
});

test('scores right answers by time left, wrong and late ones at zero', () => {
  const w = { openedAt: 1000, endsAt: 21000 };
  assert.equal(scoreMatch({ value: 'a', at: 1000 }, 'a', w), MATCH_POINTS);
  assert.equal(scoreMatch({ value: 'a', at: 11000 }, 'a', w), 750);
  assert.equal(scoreMatch({ value: 'a', at: 21000 }, 'a', w), 500);
  assert.equal(scoreMatch({ value: 'a', at: 21001 }, 'a', w), 0);
  assert.equal(scoreMatch({ value: 'a', at: 500 }, 'a', w), MATCH_POINTS);
  assert.equal(scoreMatch({ value: 'b', at: 1000 }, 'a', w), 0);
  assert.equal(scoreMatch(undefined, 'a', w), 0);
  assert.equal(
    scoreMatch({ value: 'a', at: 5 }, 'a', { openedAt: 5, endsAt: 5 }),
    MATCH_POINTS,
  );
  assert.deepEqual(
    scoreMatchRound({ p: { value: 'a', at: 1000 } }, ['p', 'q'], 'a', w),
    { p: 1000, q: 0 },
  );
});

test('reads prompts and solutions from the wire as untrusted', () => {
  const [round] = dealMatchReply([card('a'), card('b')], 's');
  assert.deepEqual(
    readMatchPrompt(JSON.parse(JSON.stringify(round!.prompt))),
    round!.prompt,
  );
  assert.equal(readMatchPrompt(null), null);
  assert.equal(readMatchPrompt({ ...round!.prompt, game: 'other' }), null);
  assert.equal(
    readMatchPrompt({ ...round!.prompt, choices: [{ id: 'a', text: 'x' }, 3] }),
    null,
  );
  assert.equal(
    readMatchPrompt({ ...round!.prompt, chapter: 5 })?.chapter,
    undefined,
  );
  assert.deepEqual(readMatchSolution(round!.solution), round!.solution);
  assert.equal(readMatchSolution('x'), null);
  assert.equal(readMatchSolution({ correct: 1, lines: [] }), null);
  const odd = readMatchSolution({
    correct: 'a',
    lines: ['ok', 2],
    sources: [
      { publisher: 'P', url: 'javascript:alert(1)' },
      { publisher: 'Q', url: 'https://q.test' },
    ],
    href: 'https://evil.test',
  });
  assert.deepEqual(odd, {
    correct: 'a',
    lines: ['ok'],
    sources: [{ publisher: 'Q', url: 'https://q.test' }],
    href: '/answers/',
  });
  assert.deepEqual(readMatchSolution({ correct: 'a', lines: [] })?.sources, []);
});

// --- Transport -------------------------------------------------------------------------------------

type Sent = { channel: string; via: 'ws' | 'http'; payload: unknown };

function fakeRealtime() {
  const sent: Sent[] = [];
  const channels: Record<
    string,
    {
      status?: (s: string) => void;
      on?: (m: { payload?: unknown }) => void;
      closed: boolean;
    }
  > = {};
  const open = (name: string): ChannelLike => {
    const ch = (channels[name] = {
      closed: false,
    } as (typeof channels)[string]);
    return {
      on: (_t, _f, cb) => ((ch.on = cb), undefined),
      subscribe: (cb) => ((ch.status = cb), undefined),
      send: async (m) =>
        void sent.push({ channel: name, via: 'ws', payload: m.payload }),
      httpSend: async (_e, payload) =>
        void sent.push({ channel: name, via: 'http', payload }),
      unsubscribe: async () => void (ch.closed = true),
    };
  };
  return { sent, channels, open };
}

function clock() {
  let t = 0;
  const timers: { at: number; fn: () => void }[] = [];
  return {
    now: () => t,
    setTimer: (fn: () => void, ms: number) => {
      const h = { at: t + ms, fn };
      timers.push(h);
      return h;
    },
    clearTimer: (h: unknown) =>
      void timers.splice(timers.indexOf(h as never), 1),
    advance(ms: number) {
      t += ms;
      for (const h of timers.filter((x) => x.at <= t)) {
        timers.splice(timers.indexOf(h), 1);
        h.fn();
      }
    },
  };
}

const names = roomChannelNames('ABC');

test('a player listens down, waits for the link, and talks up over HTTP', async () => {
  const rt = fakeRealtime();
  const statuses: string[] = [];
  const t = realtimeRoomTransport<{ kind: string; n?: number }>({
    role: 'player',
    open: rt.open,
    code: 'ABC',
    onStatus: (s) => statuses.push(s),
  });
  const got: unknown[] = [];
  const off = t.subscribe((m) => got.push(m));
  t.send({ kind: 'hello' });
  assert.equal(rt.sent.length, 0);
  assert.equal(rt.channels[names.up]!.status, undefined); // a player never joins the up channel
  rt.channels[names.down]!.status!('SUBSCRIBED');
  await Promise.resolve();
  assert.deepEqual(rt.sent, [
    { channel: names.up, via: 'http', payload: { kind: 'hello' } },
  ]);
  rt.channels[names.down]!.on!({ payload: { kind: 'state', n: 1 } });
  rt.channels[names.down]!.on!({ payload: 'junk' });
  rt.channels[names.down]!.on!({});
  assert.deepEqual(got, [{ kind: 'state', n: 1 }]);
  // A drop and a return: the hello goes again so the state is fresh.
  rt.channels[names.down]!.status!('CHANNEL_ERROR');
  rt.channels[names.down]!.status!('CHANNEL_ERROR');
  t.send({ kind: 'intent' });
  rt.channels[names.down]!.status!('SUBSCRIBED');
  await Promise.resolve();
  assert.deepEqual(
    rt.sent.slice(1).map((s) => s.payload),
    [{ kind: 'hello' }, { kind: 'intent' }],
  );
  assert.deepEqual(statuses, ['connecting', 'live', 'retrying', 'live']);
  off();
  rt.channels[names.down]!.on!({ payload: { kind: 'state', n: 2 } });
  assert.equal(got.length, 1);
  t.close();
  t.close();
  t.send({ kind: 'hello' });
  rt.channels[names.down]!.status!('SUBSCRIBED');
  assert.equal(rt.sent.length, 3);
  assert.equal(rt.channels[names.down]!.closed, true);
  assert.deepEqual(statuses.at(-1), 'closed');
});

test('a host waits for both channels, and throttles state with the newest winning', async () => {
  const rt = fakeRealtime();
  const c = clock();
  const t = realtimeRoomTransport<{ kind: string; seq?: number }>({
    role: 'host',
    open: rt.open,
    code: 'ABC',
    stateEveryMs: 400,
    resendEveryMs: 0,
    ...c,
  });
  const got: unknown[] = [];
  t.subscribe((m) => got.push(m));
  t.send({ kind: 'state', seq: 1 });
  rt.channels[names.up]!.status!('SUBSCRIBED');
  rt.channels[names.up]!.status!('SUBSCRIBED');
  assert.equal(rt.sent.length, 0);
  rt.channels[names.down]!.status!('SUBSCRIBED');
  await Promise.resolve();
  assert.deepEqual(rt.sent, [
    { channel: names.down, via: 'ws', payload: { kind: 'state', seq: 1 } },
  ]);
  rt.channels[names.up]!.on!({ payload: { kind: 'intent' } });
  assert.deepEqual(got, [{ kind: 'intent' }]);
  c.advance(100);
  t.send({ kind: 'state', seq: 2 });
  t.send({ kind: 'state', seq: 3 });
  t.send({ kind: 'rejected' });
  await Promise.resolve();
  assert.deepEqual(
    rt.sent.map((s) => (s.payload as { seq?: number }).seq ?? 'r'),
    [1, 'r'],
  );
  c.advance(300);
  await Promise.resolve();
  assert.deepEqual(
    rt.sent.map((s) => (s.payload as { seq?: number }).seq ?? 'r'),
    [1, 'r', 3],
  );
  c.advance(1000);
  t.send({ kind: 'state', seq: 4 });
  t.send({ kind: 'state', seq: 5 });
  t.close(); // the newest state still goes out
  await Promise.resolve();
  assert.deepEqual(
    rt.sent.map((s) => (s.payload as { seq?: number }).seq ?? 'r'),
    [1, 'r', 3, 4, 5],
  );
});

test('a bigger room is paced further apart, and a quiet host sends its last state again', async () => {
  const rt = fakeRealtime();
  const c = clock();
  const t = realtimeRoomTransport<{
    kind: string;
    seq?: number;
    at?: number;
    state?: { players: unknown[] };
  }>({ role: 'host', open: rt.open, code: 'ABC', ...c });
  rt.channels[names.up]!.status!('SUBSCRIBED');
  rt.channels[names.down]!.status!('SUBSCRIBED');
  const thirty = { players: Array.from({ length: 30 }, () => ({})) };
  const seqs = () => rt.sent.map((s) => (s.payload as { seq: number }).seq);
  t.send({ kind: 'state', seq: 1, at: 0, state: thirty });
  c.advance(10);
  t.send({ kind: 'state', seq: 2, at: 10, state: thirty });
  c.advance(700);
  assert.deepEqual(seqs(), [1]); // 30 players: 1,050 ms apart
  c.advance(400);
  assert.deepEqual(seqs(), [1, 2]);
  // Nothing new for 4 s: the last state goes again, stamped with the host's clock now.
  c.advance(4000);
  assert.deepEqual(seqs(), [1, 2, 2]);
  assert.equal((rt.sent[2]!.payload as { at: number }).at, c.now());
  c.advance(4000);
  assert.deepEqual(seqs(), [1, 2, 2, 2]);
  t.close();
  c.advance(10_000);
  assert.equal(rt.sent.length, 4);
});

test('falls back to a websocket send without httpSend, and survives failed sends', async () => {
  const rt = fakeRealtime();
  const open = (name: string): ChannelLike => {
    const ch = rt.open(name);
    return {
      ...ch,
      httpSend: undefined,
      send: async () => Promise.reject(new Error('down')),
    };
  };
  const t = realtimeRoomTransport({ role: 'player', open, code: 'ABC' });
  rt.channels[names.down]!.status!('SUBSCRIBED');
  t.send({ kind: 'hello' });
  t.send({ kind: 'state' });
  rt.channels[names.down]!.status!('TIMED_OUT');
  rt.channels[names.down]!.status!('CLOSED');
  await new Promise((r) => setTimeout(r, 0));
  t.close();
});

test('a host that dropped sends its last state again when it is back, however long it was away', async () => {
  const rt = fakeRealtime();
  const c = clock();
  const statuses: string[] = [];
  const t = realtimeRoomTransport<{ kind: string; seq?: number; at?: number }>({
    role: 'host',
    open: rt.open,
    code: 'ABC',
    ...c,
    onStatus: (s) => statuses.push(s),
  });
  const up = rt.channels[names.up]!;
  const down = rt.channels[names.down]!;
  const seqs = () => rt.sent.map((s) => (s.payload as { seq: number }).seq);
  up.status!('SUBSCRIBED');
  down.status!('SUBSCRIBED');
  t.send({ kind: 'state', seq: 1, at: 0 });
  assert.deepEqual(seqs(), [1]);

  // The state was lost on the way and the link drops. The host's "say it again" timer (4 s) goes
  // off while the link is down; it must not be the last chance a phone has to hear the state.
  down.status!('CLOSED');
  c.advance(5000);
  assert.deepEqual(seqs(), [1]);
  c.advance(60_000);
  down.status!('SUBSCRIBED');
  await Promise.resolve();
  assert.deepEqual(seqs(), [1, 1]);
  assert.equal((rt.sent[1]!.payload as { at: number }).at, c.now()); // stamped with the clock now
  // And the host goes on saying it while it stays quiet.
  c.advance(4000);
  assert.deepEqual(seqs(), [1, 1, 1]);
  assert.deepEqual(statuses, ['connecting', 'live', 'retrying', 'live']);
  t.close();
});

test('a host with nothing to say yet says nothing when it connects, and again after a drop', async () => {
  const rt = fakeRealtime();
  const t = realtimeRoomTransport<{ kind: string }>({
    role: 'host',
    open: rt.open,
    code: 'ABC',
    resendEveryMs: 0,
  });
  rt.channels[names.up]!.status!('SUBSCRIBED');
  rt.channels[names.down]!.status!('SUBSCRIBED');
  rt.channels[names.up]!.status!('CHANNEL_ERROR');
  rt.channels[names.up]!.status!('SUBSCRIBED');
  await Promise.resolve();
  assert.equal(rt.sent.length, 0);
  t.close();
});
