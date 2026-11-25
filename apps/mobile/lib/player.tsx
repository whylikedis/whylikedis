// The player's state on the device: loaded once at launch, appended to after every answer and
// round. Rules live in engine/ and games/; storage format and migrations in store/player.ts. There
// is no account yet, so nothing leaves the phone; the event log is ready to sync when there is.
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { eventId, historyOf, type GameEvent } from './engine/events.ts';
import type { GameId, History, Score } from './engine/types.ts';
import { reportError } from './errors/report.ts';
import { emptyPlayer, playerStore, type PlayerDoc } from './store/player.ts';

type Where = { game: GameId; mode: string; day: DayKey };

type Player = {
  ready: boolean;
  history: History;
  recordAnswer: (where: Where, item: string, score: Score) => void;
  recordRound: (where: Where, score: Score, items: number) => void;
};

const empty = historyOf([]);
const Ctx = createContext<Player>({
  ready: false,
  history: empty,
  recordAnswer: () => {},
  recordRound: () => {},
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const store = useMemo(
    () => playerStore(AsyncStorage, (e, where) => reportError(e, `storage: ${where}`)),
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

  const append = useCallback(
    (make: (device: string) => GameEvent) => {
      const cur = latest.current;
      if (!cur) return; // Not loaded yet; screens wait for `ready`.
      const next = { ...cur, events: [...cur.events, make(cur.device)] };
      latest.current = next;
      setDoc(next);
      store.save(next);
    },
    [store],
  );

  const recordAnswer = useCallback<Player['recordAnswer']>(
    (w, item, score) =>
      append((device) => {
        const at = Date.now();
        return { kind: 'answer', id: eventId(device, at), at, ...w, item, score };
      }),
    [append],
  );

  const recordRound = useCallback<Player['recordRound']>(
    (w, score, items) =>
      append((device) => {
        const at = Date.now();
        return { kind: 'round', id: eventId(device, at), at, ...w, score, items };
      }),
    [append],
  );

  const events = doc?.events;
  const history = useMemo(() => (events ? historyOf(events) : empty), [events]);
  const value = useMemo(
    () => ({ ready: doc !== null, history, recordAnswer, recordRound }),
    [doc, history, recordAnswer, recordRound],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlayer = () => useContext(Ctx);
