'use client';
// The player's history in this browser: the same document, format and migrations as the app
// (@whylikedis/games), kept in local storage under the same key. It never leaves the device. A
// browser that blocks storage still plays; it just forgets when the tab closes.
import {
  emptyPlayer,
  eventId,
  historyOf,
  playerStore,
  type GameEvent,
  type GameId,
  type History,
  type KeyValue,
  type PlayerDoc,
  type Score,
} from '@whylikedis/games';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const memory = new Map<string, string>();

// Local storage behind the async interface the store expects. Any failure (private mode, a full
// quota, storage turned off) falls back to memory for this page.
export const browserStorage: KeyValue = {
  async getItem(key) {
    try {
      return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key, value) {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Kept in memory only.
    }
  },
};

type Where = { game: GameId; mode: string; day: string };

export type WebPlayer = {
  ready: boolean;
  history: History;
  events: readonly GameEvent[];
  recordAnswer: (w: Where, item: string, score: Score) => void;
  recordRound: (w: Where, score: Score, items: number) => void;
};

const store = () => playerStore(browserStorage);

export function usePlayer(): WebPlayer {
  const [doc, setDoc] = useState<PlayerDoc | null>(null);
  const ref = useRef<PlayerDoc | null>(null);
  const persisted = useMemo(store, []);

  useEffect(() => {
    let live = true;
    persisted
      .load()
      .then(({ value }) => {
        if (!live) return;
        ref.current = value;
        setDoc(value);
      })
      .catch(() => {
        if (!live) return;
        ref.current = emptyPlayer();
        setDoc(ref.current);
      });
    return () => {
      live = false;
    };
  }, [persisted]);

  const append = useCallback(
    (make: (device: string) => GameEvent) => {
      const cur = ref.current ?? emptyPlayer();
      const next = { ...cur, events: [...cur.events, make(cur.device)] };
      ref.current = next;
      setDoc(next);
      void persisted.save(next).catch(() => {});
    },
    [persisted],
  );

  const recordAnswer = useCallback<WebPlayer['recordAnswer']>(
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

  const recordRound = useCallback<WebPlayer['recordRound']>(
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
  const history = useMemo(() => historyOf(events ?? []), [events]);
  return {
    ready: doc !== null,
    history,
    events: events ?? [],
    recordAnswer,
    recordRound,
  };
}
