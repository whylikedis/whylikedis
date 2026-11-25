// What a player did, as an append-only log of events. Everything else (the streak, which cards come
// back in practice, a score history) is derived from it. A log is what makes sync safe later: two
// devices merge by taking the union of their events by id, in any order, any number of times, and
// arrive at the same state. Nothing is ever overwritten.
import { isDayKey, type DayKey } from '../../interlace/games/daily.ts';
import type { GameId, History, Score } from './types.ts';

type Base = { id: string; game: GameId; mode: string; day: DayKey; at: number };

export type AnswerEvent = Base & { kind: 'answer'; item: string; score: Score };
export type RoundEvent = Base & { kind: 'round'; score: Score; items: number };
export type GameEvent = AnswerEvent | RoundEvent;

// An id unique enough to merge on: the device, the time, a counter and some randomness. Not a
// secret and not a security boundary.
let counter = 0;
export function eventId(device: string, at: number = Date.now()): string {
  counter = (counter + 1) % 1_679_616;
  return `${device}.${at.toString(36)}.${counter.toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

const isScore = (v: unknown): v is Score =>
  typeof v === 'object' &&
  v !== null &&
  Number.isFinite((v as Score).points) &&
  Number.isFinite((v as Score).max);

// True for an event this version of the app understands. Anything else (a newer kind from a later
// app version, a damaged record) is skipped, never allowed to crash a screen.
export function isGameEvent(v: unknown): v is GameEvent {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  if (
    typeof e.id !== 'string' ||
    typeof e.game !== 'string' ||
    typeof e.mode !== 'string' ||
    !isDayKey(e.day) ||
    typeof e.at !== 'number' ||
    !isScore(e.score)
  )
    return false;
  if (e.kind === 'answer') return typeof e.item === 'string';
  if (e.kind === 'round') return typeof e.items === 'number';
  return false;
}

const byTime = (a: GameEvent, b: GameEvent) =>
  a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// The union of two logs by id, in time order. Commutative and idempotent, so it is safe to merge
// a server copy, a backup or another device in any order.
export function mergeEvents(
  a: readonly GameEvent[],
  b: readonly GameEvent[],
): GameEvent[] {
  const seen = new Map<string, GameEvent>();
  for (const e of a) seen.set(e.id, e);
  for (const e of b) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()].sort(byTime);
}

// The History a game reads, built once per log in a single pass.
export function historyOf(events: readonly GameEvent[]): History {
  const last = new Map<string, { at: number; score: Score }>();
  const days = new Map<string, Set<DayKey>>();
  for (const e of events) {
    if (e.kind === 'answer') {
      const k = `${e.game}\u0000${e.item}`;
      const prev = last.get(k);
      if (!prev || prev.at <= e.at) last.set(k, { at: e.at, score: e.score });
    } else {
      const k = `${e.game}\u0000${e.mode}`;
      let set = days.get(k);
      if (!set) days.set(k, (set = new Set()));
      set.add(e.day);
    }
  }
  const sorted = new Map<string, DayKey[]>();
  return {
    lastScore: (game, item) => last.get(`${game}\u0000${item}`)?.score,
    playedDays: (game, mode) => {
      const k = `${game}\u0000${mode}`;
      let list = sorted.get(k);
      if (!list) sorted.set(k, (list = [...(days.get(k) ?? [])].sort()));
      return list;
    },
  };
}
