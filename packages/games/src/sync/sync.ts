// Sync for the event log, written before there is a server so the app's data is built for it from
// day one. A remote only has to keep events by id and hand back what arrived after a cursor; the
// merge (engine/events.ts) is order-free and idempotent, so a retry, a lost reply or a device
// that was offline for a month all end in the same log everywhere. No remote is wired up yet:
// that needs accounts, which wait for the owners.
import { isGameEvent, mergeEvents, type GameEvent } from '../engine/events.ts';

export interface SyncRemote {
  // Store these events. Must ignore ids it already has, so pushing twice is harmless.
  push(events: readonly GameEvent[]): Promise<void>;
  // Events stored after `cursor` (all of them when null), and the cursor to pass next time.
  pull(cursor: string | null): Promise<{ events: unknown[]; cursor: string }>;
}

// What a device remembers between syncs.
export type SyncState = {
  // The remote's cursor after the last pull.
  cursor: string | null;
  // The newest `at` among this device's events the remote has confirmed.
  pushedAt: number;
};

export const NEVER_SYNCED: SyncState = { cursor: null, pushedAt: 0 };

// Events a clock moved back by this much still go out again; the remote drops the repeats.
export const CLOCK_SLACK_MS = 5 * 60_000;

export const ownEvents = (events: readonly GameEvent[], device: string) =>
  events.filter((e) => e.id.startsWith(`${device}.`));

// This device's events the remote may not have yet.
export function outbox(
  events: readonly GameEvent[],
  device: string,
  state: SyncState,
): GameEvent[] {
  const from = state.pushedAt - CLOCK_SLACK_MS;
  return ownEvents(events, device).filter(
    (e) => state.pushedAt === 0 || e.at > from,
  );
}

export type SyncResult = {
  events: GameEvent[];
  state: SyncState;
  pushed: number;
  pulled: number;
  // Records from the remote this app version could not read, skipped and counted.
  skipped: number;
};

// One round trip: push, then pull and merge. If either call throws, the error reaches the caller
// and nothing local changes, so the next attempt starts from the same place.
export async function syncOnce(
  events: readonly GameEvent[],
  device: string,
  state: SyncState,
  remote: SyncRemote,
): Promise<SyncResult> {
  const out = outbox(events, device, state);
  if (out.length) await remote.push(out);
  const pushedAt = out.reduce((t, e) => Math.max(t, e.at), state.pushedAt);
  const { events: raw, cursor } = await remote.pull(state.cursor);
  const incoming = raw.filter(isGameEvent);
  return {
    events: mergeEvents(events, incoming),
    state: { cursor, pushedAt },
    pushed: out.length,
    pulled: incoming.length,
    skipped: raw.length - incoming.length,
  };
}

// A remote in memory that behaves like a real one (dedupes by id, cursors by arrival order), for
// tests and for trying sync in development.
export function memoryRemote() {
  const log: GameEvent[] = [];
  const ids = new Set<string>();
  const remote = {
    log,
    calls: { push: 0, pull: 0 },
    failNext: null as null | 'push' | 'pull',
    async push(events: readonly GameEvent[]) {
      remote.calls.push++;
      if (remote.failNext === 'push') {
        remote.failNext = null;
        throw new Error('network down');
      }
      for (const e of events)
        if (!ids.has(e.id)) {
          ids.add(e.id);
          log.push(e);
        }
    },
    async pull(cursor: string | null) {
      remote.calls.pull++;
      if (remote.failNext === 'pull') {
        remote.failNext = null;
        throw new Error('network down');
      }
      const from = cursor ? Number(cursor) : 0;
      return {
        events: log.slice(from) as unknown[],
        cursor: String(log.length),
      };
    },
  };
  return remote;
}
