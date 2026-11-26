'use client';
// How a live room reaches the other screens. With Supabase configured, over Supabase Realtime
// (broadcast only: no table, nothing stored, free tier). Without it, over BroadcastChannel, so the
// host and players work in tabs of one browser: enough for a preview and for the tests.
import { realtimeRoomTransport, type RoomLinkStatus } from '@whylikedis/games';
import { useEffect, useState } from 'react';
import {
  createBroadcastRoomTransport,
  type RoomMessage,
  type RoomTransport,
} from '@/components/ui/games/room-model';
import { supabase } from './supabase/client';
import { AUTH_ENABLED } from './supabase/config';

/** Rooms reach other devices only when Supabase is configured. */
export const ROOMS_ACROSS_DEVICES = AUTH_ENABLED;

/** The most players a room takes: inside the free tier's message budget. */
export const MAX_PLAYERS = 30;

export function useRoomTransport(
  role: 'host' | 'player',
  code: string | null,
): { transport: RoomTransport | null; status: RoomLinkStatus } {
  const [transport, setTransport] = useState<RoomTransport | null>(null);
  const [status, setStatus] = useState<RoomLinkStatus>('connecting');
  useEffect(() => {
    if (!code) return;
    let t: RoomTransport | null;
    if (ROOMS_ACROSS_DEVICES) {
      const client = supabase();
      t = realtimeRoomTransport<RoomMessage>({
        role,
        code,
        open: (name) =>
          client.channel(name, {
            config: { broadcast: { self: false, ack: false } },
          }),
        onStatus: setStatus,
      });
    } else {
      t = createBroadcastRoomTransport(`wld-room:${code}`);
      setStatus(t ? 'live' : 'closed');
    }
    setTransport(t);
    return () => {
      t?.close?.();
      setTransport(null);
    };
  }, [role, code]);
  return { transport, status };
}

const ID_KEY = 'wld.room.id';

/** A random id for this tab, kept so a reload rejoins as the same player; each tab is its own player. */
export function useDeviceId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let value: string | null = null;
    try {
      value = window.sessionStorage.getItem(ID_KEY);
    } catch {}
    if (!value) {
      value = crypto.randomUUID();
      try {
        window.sessionStorage.setItem(ID_KEY, value);
      } catch {}
    }
    setId(value);
  }, []);
  return id;
}

const NAME_KEY = 'wld.room.name';

export function savedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {}
}
