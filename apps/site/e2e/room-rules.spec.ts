// The rules of a room, without a browser: what the host accepts, in what order, from whom, and
// what a repeated, late or out-of-order message does. The pages are checked in rooms.spec.ts.
import { expect, test } from '@playwright/test';
import {
  applyRoomEvent,
  answerProgress,
  createRoom,
  rejectRoomEvent,
  type RoomEvent,
  type RoomState,
} from '@/components/ui/games/room-model';

const HOST = 'host';
const LIMIT = { maxPlayers: 30 };

const run = (state: RoomState, from: string, event: RoomEvent) =>
  applyRoomEvent(state, event, from, LIMIT);
const join = (state: RoomState, id: string, name = `Player ${id}`) =>
  run(state, id, { type: 'join', playerId: id, name, at: 1 });
const room = () =>
  createRoom({
    code: 'K7Q4MZ',
    hostId: HOST,
    rounds: 3,
    codeExpiresAt: 10_000,
  });

/** A room in the question phase with these players in. */
function inRound(...ids: string[]) {
  let s = room();
  for (const id of ids) s = join(s, id);
  s = run(s, HOST, { type: 'countdown', startsAt: 5 });
  return run(s, HOST, { type: 'question', endsAt: 9_000, prompt: { q: 1 } });
}

test.describe('who may join, and when', () => {
  test('a join is a reconnect when the player is known, so it changes nothing about the room', () => {
    let s = join(room(), 'a');
    s = run(s, 'a', { type: 'leave', playerId: 'a' });
    expect(s.players[0]!.connected).toBe(false);
    s = join(s, 'a');
    expect(s.players).toHaveLength(1);
    expect(s.players[0]!.connected).toBe(true);
    // A join that arrives twice is the same join.
    const again = join(s, 'a');
    expect(again.players).toEqual(s.players);
    expect(again.scores).toEqual(s.scores);
  });

  test('players can join during a round, countdown, reveal and podium, and start at zero', () => {
    let s = inRound('a');
    s = join(s, 'late');
    expect(s.scores['late']).toBe(0);
    expect(s.phase).toBe('question');
    expect(
      rejectRoomEvent(
        s,
        { type: 'answer', playerId: 'late', value: 'x', at: 2 },
        'late',
      ),
    ).toBeNull();
    s = run(s, HOST, { type: 'reveal', points: { a: 500 } });
    s = join(s, 'later');
    s = run(s, HOST, { type: 'podium' });
    s = join(s, 'latest');
    expect(s.players.map((p) => p.id)).toEqual([
      'a',
      'late',
      'later',
      'latest',
    ]);
    expect(s.scores['a']).toBe(500);
  });

  test('a locked room turns new players away but lets its own back in', () => {
    let s = join(room(), 'a');
    s = run(s, HOST, { type: 'lock', locked: true });
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'b', name: 'B', at: 1 },
        'b',
        LIMIT,
      ),
    ).toBe('locked');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'a', name: 'A', at: 1 },
        'a',
        LIMIT,
      ),
    ).toBeNull();
  });

  test('a code that ran out turns new players away, and a join with no host timestamp counts as late', () => {
    const s = join(room(), 'a');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'b', name: 'B', at: 10_000 },
        'b',
        LIMIT,
      ),
    ).toBe('expired');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'b', name: 'B' } as RoomEvent,
        'b',
        LIMIT,
      ),
    ).toBe('expired');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'a', name: 'A', at: 10_000 },
        'a',
        LIMIT,
      ),
    ).toBeNull();
  });
});

test.describe('a room of thirty', () => {
  test('takes thirty, refuses the thirty-first, and still takes back a player who was in', () => {
    let s = room();
    for (let i = 1; i <= 30; i++) s = join(s, `p${i}`);
    expect(s.players).toHaveLength(30);
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'p31', name: 'P31', at: 1 },
        'p31',
        LIMIT,
      ),
    ).toBe('full');
    expect(join(s, 'p31')).toBe(s);
    // Someone leaves and comes back: no second seat, and nobody takes the first one meanwhile.
    s = run(s, 'p7', { type: 'leave', playerId: 'p7' });
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'p7', name: 'Player p7', at: 1 },
        'p7',
        LIMIT,
      ),
    ).toBeNull();
    s = join(s, 'p7');
    expect(s.players).toHaveLength(30);
    // Removing one frees a seat.
    s = run(s, HOST, { type: 'remove', playerId: 'p30' });
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'p31', name: 'P31', at: 1 },
        'p31',
        LIMIT,
      ),
    ).toBeNull();
  });

  test('counts answers across thirty players, and the round is complete only when all are in', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
    let s = inRound(...ids);
    for (const id of ids.slice(0, 29))
      s = run(s, id, { type: 'answer', playerId: id, value: 'a', at: 5 });
    expect(answerProgress(s)).toEqual({ answered: 29, total: 30 });
    s = run(s, 'p30', { type: 'answer', playerId: 'p30', value: 'b', at: 6 });
    expect(answerProgress(s)).toEqual({ answered: 30, total: 30 });
  });
});

test.describe('messages that repeat, come late or come in the wrong order', () => {
  test('a second answer from the same player is refused, and the first one stands', () => {
    let s = inRound('a');
    s = run(s, 'a', { type: 'answer', playerId: 'a', value: 'first', at: 5 });
    expect(
      rejectRoomEvent(
        s,
        { type: 'answer', playerId: 'a', value: 'second', at: 6 },
        'a',
      ),
    ).toBe('already-answered');
    expect(
      run(s, 'a', { type: 'answer', playerId: 'a', value: 'second', at: 6 }),
    ).toBe(s);
    expect(s.answers['a']!.value).toBe('first');
  });

  test('an answer that arrives after the reveal, or before the question, is refused', () => {
    const before = join(room(), 'a');
    expect(
      rejectRoomEvent(
        before,
        { type: 'answer', playerId: 'a', value: 'x', at: 1 },
        'a',
      ),
    ).toBe('wrong-phase');
    let s = inRound('a');
    s = run(s, HOST, { type: 'reveal', points: {} });
    expect(
      rejectRoomEvent(
        s,
        { type: 'answer', playerId: 'a', value: 'x', at: 1 },
        'a',
      ),
    ).toBe('wrong-phase');
  });

  test('a round cannot be revealed twice, so a repeated reveal scores once', () => {
    let s = inRound('a');
    s = run(s, 'a', { type: 'answer', playerId: 'a', value: 'x', at: 1 });
    s = run(s, HOST, { type: 'reveal', points: { a: 700 } });
    const again = run(s, HOST, { type: 'reveal', points: { a: 700 } });
    expect(again).toBe(s);
    expect(s.scores['a']).toBe(700);
  });

  test('host steps out of order are refused', () => {
    const lobby = join(room(), 'a');
    expect(rejectRoomEvent(lobby, { type: 'reveal', points: {} }, HOST)).toBe(
      'wrong-phase',
    );
    expect(rejectRoomEvent(lobby, { type: 'podium' }, HOST)).toBe(
      'wrong-phase',
    );
    expect(rejectRoomEvent(lobby, { type: 'question', endsAt: 1 }, HOST)).toBe(
      'wrong-phase',
    );
    const closed = run(lobby, HOST, { type: 'close' });
    expect(
      rejectRoomEvent(closed, { type: 'countdown', startsAt: 1 }, HOST),
    ).toBe('closed');
    expect(
      rejectRoomEvent(
        closed,
        { type: 'join', playerId: 'z', name: 'Z', at: 1 },
        'z',
        LIMIT,
      ),
    ).toBe('closed');
  });

  test('a player cannot act for another, or as the host', () => {
    const s = inRound('a', 'b');
    expect(
      rejectRoomEvent(
        s,
        { type: 'answer', playerId: 'b', value: 'x', at: 1 },
        'a',
      ),
    ).toBe('not-you');
    expect(
      rejectRoomEvent(s, { type: 'reveal', points: { a: 9999 } }, 'a'),
    ).toBe('not-host');
    expect(rejectRoomEvent(s, { type: 'remove', playerId: 'b' }, 'a')).toBe(
      'not-host',
    );
    expect(rejectRoomEvent(s, { type: 'lock', locked: true }, 'a')).toBe(
      'not-host',
    );
  });

  test('every accepted event moves the sequence on, so a client can keep only the newest state', () => {
    let s = room();
    const seqs = [s.seq];
    s = join(s, 'a');
    seqs.push(s.seq);
    s = run(s, HOST, { type: 'countdown', startsAt: 1 });
    seqs.push(s.seq);
    s = run(s, HOST, { type: 'question', endsAt: 2 });
    seqs.push(s.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    // A refused event changes nothing, not even the sequence.
    expect(run(s, 'a', { type: 'reveal', points: {} }).seq).toBe(s.seq);
  });

  test('a removed player cannot come back with the same id, and names stay unique', () => {
    let s = join(join(room(), 'a', 'Dana'), 'b', 'Eli');
    s = run(s, HOST, { type: 'remove', playerId: 'b' });
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'b', name: 'Eli', at: 1 },
        'b',
        LIMIT,
      ),
    ).toBe('removed');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'c', name: ' dana ', at: 1 },
        'c',
        LIMIT,
      ),
    ).toBe('name-taken');
    expect(
      rejectRoomEvent(
        s,
        { type: 'join', playerId: 'c', name: '   ', at: 1 },
        'c',
        LIMIT,
      ),
    ).toBe('name-empty');
  });
});
