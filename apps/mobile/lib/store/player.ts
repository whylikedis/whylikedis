// The player's document on the device: a device id and the event log. Pure, so its migrations are
// tested in Node. The React side (../player.tsx) loads it once and appends to it.
import type { GameEvent } from '../engine/events.ts';
import { eventId, isGameEvent } from '../engine/events.ts';
import type { KeyValue } from './persisted.ts';
import { createPersisted } from './persisted.ts';

export type PlayerDoc = {
  version: 2;
  // Random, made on first launch. It names this device's events so logs merge; it identifies no one.
  device: string;
  events: GameEvent[];
};

export const PLAYER_KEY = 'wld.player';
// The first app build kept { version: 1, played, ratings } here.
export const LEGACY_PROGRESS_KEY = 'wld.progress.v1';

export const WWYS = 'what-would-you-say';

export const newDevice = () =>
  `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const emptyPlayer = (): PlayerDoc => ({
  version: 2,
  device: newDevice(),
  events: [],
});

const noonUtc = (day: string) => Date.parse(`${day}T12:00:00Z`);

// Version 1 to 2: every rating becomes an answer, and every played day a finished daily round, so
// the streak and practice order carry over exactly.
export function fromV1(v1: any): PlayerDoc {
  const device = newDevice();
  const events: GameEvent[] = [];
  const ratings =
    v1 && typeof v1.ratings === 'object' && v1.ratings ? v1.ratings : {};
  for (const [item, r] of Object.entries<any>(ratings)) {
    if (typeof r?.day !== 'string') continue;
    const at = noonUtc(r.day);
    events.push({
      kind: 'answer',
      id: eventId(device, at),
      game: WWYS,
      mode: 'practice',
      day: r.day,
      at,
      item,
      score: { points: r.rating === 'had-it' ? 1 : 0, max: 1 },
    });
  }
  for (const day of Array.isArray(v1?.played) ? v1.played : []) {
    if (typeof day !== 'string') continue;
    const at = noonUtc(day) + 1;
    events.push({
      kind: 'round',
      id: eventId(device, at),
      game: WWYS,
      mode: 'daily',
      day,
      at,
      items: 1,
      score: { points: 0, max: 0 },
    });
  }
  return {
    version: 2,
    device,
    events: events.filter(isGameEvent).sort((a, b) => a.at - b.at),
  };
}

// Keeps the events this app version understands and drops the rest, so one bad record never costs
// a player their whole history.
export function validatePlayer(v: unknown): PlayerDoc | null {
  if (typeof v !== 'object' || v === null) return null;
  const d = v as Record<string, unknown>;
  if (d.version !== 2 || typeof d.device !== 'string' || !Array.isArray(d.events))
    return null;
  return { version: 2, device: d.device, events: d.events.filter(isGameEvent) };
}

export const playerStore = (
  storage: KeyValue,
  onError?: (e: unknown, where: string) => void,
) =>
  createPersisted<PlayerDoc>({
    storage,
    key: PLAYER_KEY,
    version: 2,
    empty: emptyPlayer,
    migrations: { 1: fromV1 },
    validate: validatePlayer,
    legacyKeys: [LEGACY_PROGRESS_KEY],
    onError,
  });
