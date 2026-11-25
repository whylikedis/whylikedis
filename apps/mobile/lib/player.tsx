// The player's state on the device: loaded once at launch, appended to after every answer and
// round. Rules live in engine/ and games/; storage format and migrations in store/player.ts. There
// is no account yet, so nothing leaves the phone; the event log is ready to sync when there is.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DayKey } from '../interlace/games/daily.ts';
import {
  eventId,
  historyOf,
  mergeEvents,
  type GameEvent,
} from '@whylikedis/games';
import type { GameId, History, Score } from '@whylikedis/games';
import { reportError } from './errors/report.ts';
import { mark } from './perf.ts';
import { emptyPlayer, playerStore, type PlayerDoc } from '@whylikedis/games';
import { NEVER_SYNCED, syncOnce, type SyncRemote } from '@whylikedis/games';

type Where = { game: GameId; mode: string; day: DayKey };

type Player = {
  ready: boolean;
  history: History;
  recordAnswer: (where: Where, item: string, score: Score) => void;
  recordRound: (where: Where, score: Score, items: number) => void;
  seenUpdates: readonly string[];
  markUpdatesSeen: (ids: readonly string[]) => void;
  eventCount: number;
  synced: boolean;
};

const empty = historyOf([]);
const Ctx = createContext<Player>({
  ready: false,
  history: empty,
  recordAnswer: () => {},
  recordRound: () => {},
  seenUpdates: [],
  markUpdatesSeen: () => {},
  eventCount: 0,
  synced: false,
});

// `remote` is where the log syncs. None exists until there are accounts; with none, nothing
// leaves the phone.
export function PlayerProvider({
  children,
  remote = null,
}: {
  children: ReactNode;
  remote?: SyncRemote | null;
}) {
  const store = useMemo(
    () =>
      playerStore(AsyncStorage, (e, where) =>
        reportError(e, `storage: ${where}`),
      ),
    [],
  );
  const [doc, setDoc] = useState<PlayerDoc | null>(null);
  // The latest document, so appends made in the same tick never read a stale copy.
  const latest = useRef<PlayerDoc | null>(null);

  useEffect(() => {
    let live = true;
    store
      .load()
      .then(({ value, source }) => {
        if (!live) return;
        mark('storage loaded');
        latest.current = value;
        setDoc(value);
        if (source === 'migrated' || source === 'empty') store.save(value);
      })
      .catch((e) => {
        reportError(e, 'storage: load');
        if (live) setDoc((latest.current = emptyPlayer()));
      });
    return () => {
      live = false;
    };
  }, [store]);

  // Every change goes through here: it reads the newest document, so changes made in the same
  // tick (or while a sync is in flight) never overwrite each other.
  const update = useCallback(
    (change: (doc: PlayerDoc) => PlayerDoc) => {
      const cur = latest.current;
      if (!cur) return; // Not loaded yet; screens wait for `ready`.
      const next = change(cur);
      if (next === cur) return;
      latest.current = next;
      setDoc(next);
      store.save(next);
    },
    [store],
  );

  const append = useCallback(
    (make: (device: string) => GameEvent) =>
      update((cur) => ({ ...cur, events: [...cur.events, make(cur.device)] })),
    [update],
  );

  const markUpdatesSeen = useCallback(
    (ids: readonly string[]) =>
      update((cur) => {
        const seen = new Set(cur.seenUpdates ?? []);
        const fresh = ids.filter((id) => !seen.has(id));
        return fresh.length
          ? { ...cur, seenUpdates: [...(cur.seenUpdates ?? []), ...fresh] }
          : cur;
      }),
    [update],
  );

  // Sync after loading and whenever the app comes back to the foreground. One run at a time; a
  // failure is reported and the next run starts from the same place.
  const syncing = useRef(false);
  const runSync = useCallback(async () => {
    const cur = latest.current;
    if (!remote || !cur || syncing.current) return;
    syncing.current = true;
    try {
      const r = await syncOnce(
        cur.events,
        cur.device,
        cur.sync ?? NEVER_SYNCED,
        remote,
      );
      update((now) => ({
        ...now,
        // Events added while the sync was in flight are kept: merging is idempotent.
        events: mergeEvents(now.events, r.events),
        sync: r.state,
      }));
      if (r.skipped)
        reportError(
          new Error(`${r.skipped} unreadable events skipped`),
          'sync',
        );
    } catch (e) {
      reportError(e, 'sync');
    } finally {
      syncing.current = false;
    }
  }, [remote, update]);

  const loaded = doc !== null;
  useEffect(() => {
    if (!loaded || !remote) return;
    runSync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') runSync();
    });
    return () => sub.remove();
  }, [loaded, remote, runSync]);

  const recordAnswer = useCallback<Player['recordAnswer']>(
    (w, item, score) =>
      append((device) => {
        const at = Date.now();
        return {
          kind: 'answer',
          id: eventId(device, at),
          at,
          ...w,
          item,
          score,
        };
      }),
    [append],
  );

  const recordRound = useCallback<Player['recordRound']>(
    (w, score, items) =>
      append((device) => {
        const at = Date.now();
        return {
          kind: 'round',
          id: eventId(device, at),
          at,
          ...w,
          score,
          items,
        };
      }),
    [append],
  );

  const events = doc?.events;
  const history = useMemo(() => (events ? historyOf(events) : empty), [events]);
  const value = useMemo(
    () => ({
      ready: doc !== null,
      history,
      recordAnswer,
      recordRound,
      seenUpdates: doc?.seenUpdates ?? [],
      markUpdatesSeen,
      eventCount: doc?.events.length ?? 0,
      synced: !!doc?.sync,
    }),
    [doc, history, recordAnswer, recordRound, markUpdatesSeen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlayer = () => useContext(Ctx);
