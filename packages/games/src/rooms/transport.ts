// A live room over a hosted realtime service, for Interlace's `RoomTransport` (room-model). The room
// uses two channels so a busy room stays inside the free tier's message budget:
//
//   room:<code>      down: the host sends the room's state; every phone listens.
//   room:<code>:up   up:   phones send joins and answers over HTTP; only the host listens.
//
// One channel for both would deliver every phone's answer to every other phone too (n² messages).
// The host's state is also sent at most once per `stateEveryMs`, the newest one winning, so thirty
// answers in a second become a few broadcasts, not thirty.
//
// The channels are given as plain objects with the few methods used here, so Supabase's
// RealtimeChannel fits as is, and a test passes a fake.

/** What travels: the host's `state` and `rejected` go down; `intent` and `hello` go up. */
export type RoomWireMessage = { kind: string };

const UP_KINDS = new Set(['intent', 'hello']);

/** The parts of a Supabase RealtimeChannel this transport uses. */
export interface ChannelLike {
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (message: { payload?: unknown }) => void,
  ): unknown;
  subscribe(callback?: (status: string, error?: Error) => void): unknown;
  send(message: {
    type: 'broadcast';
    event: string;
    payload: unknown;
  }): Promise<unknown>;
  httpSend?(event: string, payload: unknown): Promise<unknown>;
  unsubscribe(): Promise<unknown>;
}

export type RoomLinkStatus = 'connecting' | 'live' | 'retrying' | 'closed';

export interface RealtimeRoomOptions {
  role: 'host' | 'player';
  /** Opens a channel by name, e.g. `(name) => supabase.channel(name, { config: { broadcast: { self: false } } })`. */
  open: (name: string) => ChannelLike;
  code: string;
  /** The broadcast event name. @default 'room' */
  event?: string;
  /**
   * Host only: the fewest ms between two state broadcasts, or a function of the number of
   * players in the state, so a big room stays inside the message budget (each broadcast is
   * one message per phone). @default (players) => Math.max(600, players * 35)
   */
  stateEveryMs?: number | ((players: number) => number);
  /**
   * Host only: send the last state again after this long without a new one, so a phone that
   * lost a broadcast catches up without asking. 0 turns it off. @default 4000
   */
  resendEveryMs?: number;
  /** The link to the room went up or down. After a drop, a player's last `hello` is sent again. */
  onStatus?: (status: RoomLinkStatus) => void;
  /** Timers, for tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
}

export interface RealtimeRoomTransport<M extends RoomWireMessage> {
  send(message: M): void;
  subscribe(listener: (message: M) => void): () => void;
  close(): void;
}

export const roomChannelNames = (code: string) => ({
  down: `room:${code}`,
  up: `room:${code}:up`,
});

const isMessage = (x: unknown): x is RoomWireMessage =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as { kind?: unknown }).kind === 'string';

export function realtimeRoomTransport<M extends RoomWireMessage>(
  options: RealtimeRoomOptions,
): RealtimeRoomTransport<M> {
  const {
    role,
    open,
    code,
    event = 'room',
    stateEveryMs = (players: number) => Math.max(600, players * 35),
    resendEveryMs = 4000,
    onStatus,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    now = Date.now,
  } = options;
  const names = roomChannelNames(code);
  const listeners = new Set<(message: M) => void>();
  const deliver = (payload: unknown) => {
    if (isMessage(payload)) for (const l of listeners) l(payload as M);
  };

  const down = open(names.down);
  const up = open(names.up);
  let live = false;
  let closed = false;
  let everLive = false;
  const queue: M[] = [];
  let hello: M | null = null;

  // The host listens up and talks down; a player listens down and talks up (over HTTP).
  const listen = role === 'host' ? up : down;
  listen.on('broadcast', { event }, (m) => deliver(m.payload));

  const status = (s: RoomLinkStatus) => onStatus?.(s);
  status('connecting');

  const subscribeTo = role === 'host' ? [up, down] : [down];
  let ready = 0;
  for (const ch of subscribeTo) {
    let joined = false;
    ch.subscribe((s) => {
      if (closed) return;
      if (s === 'SUBSCRIBED') {
        if (!joined) ready++;
        joined = true;
        if (ready === subscribeTo.length) {
          const again = everLive;
          live = true;
          everLive = true;
          status('live');
          // Back after a drop: a player asks for the state again, since it may have missed some.
          if (again && hello) raw(hello);
          flush();
        }
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        if (joined) ready--;
        joined = false;
        if (live) {
          live = false;
          status('retrying');
        }
      }
    });
  }

  const raw = (message: M) => {
    if (UP_KINDS.has(message.kind)) {
      // A player is not subscribed to the up channel: send over HTTP.
      if (up.httpSend) void up.httpSend(event, message).catch(() => {});
      else
        void up
          .send({ type: 'broadcast', event, payload: message })
          .catch(() => {});
    } else {
      void down
        .send({ type: 'broadcast', event, payload: message })
        .catch(() => {});
    }
  };

  // Host state, at most once per stateEveryMs, the newest winning; the last one again when quiet.
  let pendingState: M | null = null;
  let lastState: M | null = null;
  let lastStateAt = -Infinity;
  let timer: unknown = null;
  let resendTimer: unknown = null;
  const playersIn = (m: M) => {
    const players = (m as { state?: { players?: unknown } }).state?.players;
    return Array.isArray(players) ? players.length : 0;
  };
  const gap = (m: M) =>
    typeof stateEveryMs === 'function'
      ? stateEveryMs(playersIn(m))
      : stateEveryMs;
  const stamp = (m: M): M =>
    'at' in (m as object) ? ({ ...m, at: now() } as M) : m;
  const scheduleResend = () => {
    if (resendEveryMs <= 0) return;
    if (resendTimer !== null) clearTimer(resendTimer);
    resendTimer = setTimer(() => {
      resendTimer = null;
      if (closed || !live || !lastState || timer !== null) return;
      lastStateAt = now();
      // Re-stamped: the host's clock moves on, and phones use it to read deadlines.
      raw(stamp(lastState));
      scheduleResend();
    }, resendEveryMs);
  };
  const emit = (message: M) => {
    lastStateAt = now();
    lastState = message;
    raw(message);
    scheduleResend();
  };
  const sendState = (message: M) => {
    const wait = lastStateAt + gap(message) - now();
    if (wait <= 0 && timer === null) {
      emit(message);
      return;
    }
    pendingState = message;
    if (timer === null)
      timer = setTimer(
        () => {
          timer = null;
          const next = pendingState;
          pendingState = null;
          if (next && !closed) emit(next);
        },
        Math.max(0, wait),
      );
  };

  const flush = () => {
    while (live && queue.length) {
      const m = queue.shift()!;
      dispatch(m);
    }
  };

  const dispatch = (message: M) => {
    if (message.kind === 'state') sendState(message);
    else raw(message);
  };

  return {
    send(message) {
      if (closed) return;
      if (message.kind === 'hello') hello = message;
      // Everything waits for the link: a hello sent before a phone listens would miss the answer.
      if (live) dispatch(message);
      else queue.push(message);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      if (closed) return;
      closed = true;
      live = false;
      if (timer !== null) clearTimer(timer);
      if (resendTimer !== null) clearTimer(resendTimer);
      // The last state still goes out, so a podium is never lost to the throttle.
      if (pendingState) raw(pendingState);
      listeners.clear();
      void down.unsubscribe().catch(() => {});
      void up.unsubscribe().catch(() => {});
      status('closed');
    },
  };
}
