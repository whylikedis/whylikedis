// A fake Supabase Realtime for the browser checks: a Phoenix-channels server in the test process, so
// the real supabase-js client and the room's real transport (packages/games/src/rooms/transport.ts)
// run unchanged, and a check decides what the network does: drop it, hold messages back, send them
// twice, send them out of order. Nothing leaves the machine.
//
// What it speaks, of Realtime's protocol (serializer 2.0.0):
//   - text frames [join_ref, ref, topic, event, payload]: phx_join, phx_leave, heartbeat, and the
//     broadcasts it forwards, as text frames to every other client joined to the topic;
//   - the binary frame a client uses to broadcast over the socket (a host's state goes down so);
//   - POST /realtime/v1/api/broadcast/<topic>/events/<event>, how a phone sends over HTTP.
import type { Page, Route, WebSocketRoute } from '@playwright/test';
import { SUPABASE } from './env.mjs';

/** One broadcast on its way to one client. */
export type Wire = {
  topic: string;
  event: string;
  payload: unknown;
  /** Which way it goes: `down` is the host's room channel, `up` the phones' answers. */
  channel: 'down' | 'up';
  /** The payload's `kind`: state, intent, hello, rejected. */
  kind: string;
  /** Counts every broadcast the hub has seen, from 1. */
  n: number;
};

/** What to do with a message: when to deliver it (ms from now), once per entry. [] drops it. */
export type Plan = number[];

type Client = {
  id: number;
  page: Page;
  ws: WebSocketRoute;
  topics: Set<string>;
  joinRefs: Map<string, string | null>;
};

const roomTopic = (name: string) => name.replace(/^realtime:/, '');
const channelOf = (topic: string): 'down' | 'up' =>
  topic.endsWith(':up') ? 'up' : 'down';

export class FakeRealtime {
  private clients = new Set<Client>();
  private ids = 0;
  private seen = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  /** Every broadcast, in the order the hub received it. */
  readonly log: Wire[] = [];
  /** Decides, per message and per receiving client, when it arrives. Default: at once, once. */
  plan: (wire: Wire, to: number) => Plan = () => [0];
  /** While true a phone's HTTP send fails (a flaky upload), and the page sees a 503. */
  httpDown = false;
  /** While true no socket can connect: the client's reconnect loop keeps failing. */
  refuse = false;
  /** Pages that cannot connect, whatever `refuse` says: see `cut`. */
  private cutOff = new Set<Page>();

  private deliverNow(c: Client, wire: Wire) {
    const frame = JSON.stringify([
      null,
      null,
      wire.topic.startsWith('realtime:')
        ? wire.topic
        : `realtime:${wire.topic}`,
      'broadcast',
      { type: 'broadcast', event: wire.event, payload: wire.payload },
    ]);
    try {
      c.ws.send(frame);
    } catch {
      // The page closed while the message was in flight.
    }
  }

  /** Broadcast to every client joined to `topic`, except the one it came from. */
  publish(topic: string, event: string, payload: unknown, from?: number) {
    const name = roomTopic(topic);
    const wire: Wire = {
      topic: name,
      event,
      payload,
      channel: channelOf(name),
      kind: (payload as { kind?: string } | null)?.kind ?? '',
      n: ++this.seen,
    };
    this.log.push(wire);
    for (const c of this.clients) {
      if (c.id === from || !c.topics.has(name)) continue;
      for (const afterMs of this.plan(wire, c.id)) {
        if (afterMs <= 0) this.deliverNow(c, wire);
        else {
          const t = setTimeout(() => {
            this.timers.delete(t);
            if (this.clients.has(c)) this.deliverNow(c, wire);
          }, afterMs);
          this.timers.add(t);
        }
      }
    }
  }

  /** Messages the hub has seen, by channel and kind, for counting what a room costs. */
  count(channel: 'down' | 'up', kind: string, from = 0) {
    return this.log.filter(
      (w) => w.n > from && w.channel === channel && w.kind === kind,
    ).length;
  }

  /** How many broadcasts the hub has seen so far, to count from here later. */
  mark() {
    return this.seen;
  }

  /** Clients joined to a topic. */
  listeners(topic: string) {
    return [...this.clients].filter((c) => c.topics.has(topic)).length;
  }

  /** Close every socket, as a network drop does. The clients reconnect on their own. */
  dropAll() {
    for (const c of [...this.clients]) {
      this.clients.delete(c);
      c.ws.close({ code: 1006, reason: 'network dropped' });
    }
  }

  /** One page loses its connection and cannot get it back until `restore`. */
  cut(page: Page) {
    this.cutOff.add(page);
    for (const c of [...this.clients].filter((c) => c.page === page)) {
      this.clients.delete(c);
      c.ws.close({ code: 1006, reason: 'network dropped' });
    }
  }

  /** The page may connect again; its client reconnects by itself. */
  restore(page: Page) {
    this.cutOff.delete(page);
  }

  /** Forget everything in flight. */
  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private onSocket(page: Page, ws: WebSocketRoute) {
    if (this.refuse || this.cutOff.has(page)) {
      ws.close({ code: 1006, reason: 'refused' });
      return;
    }
    const client: Client = {
      id: ++this.ids,
      page,
      ws,
      topics: new Set(),
      joinRefs: new Map(),
    };
    this.clients.add(client);
    ws.onClose(() => this.clients.delete(client));
    ws.onMessage((message) => {
      if (typeof message !== 'string') return this.onBinary(client, message);
      const [joinRef, ref, topic, event, payload] = JSON.parse(message) as [
        string | null,
        string | null,
        string,
        string,
        { type?: string; event?: string; payload?: unknown },
      ];
      const reply = (response: unknown = {}) =>
        ws.send(
          JSON.stringify([
            joinRef,
            ref,
            topic,
            'phx_reply',
            { status: 'ok', response },
          ]),
        );
      if (event === 'phx_join') {
        client.topics.add(roomTopic(topic));
        client.joinRefs.set(topic, joinRef);
        reply({ postgres_changes: [] });
      } else if (event === 'phx_leave') {
        client.topics.delete(roomTopic(topic));
        reply();
      } else if (event === 'heartbeat') {
        ws.send(
          JSON.stringify([
            null,
            ref,
            'phoenix',
            'phx_reply',
            { status: 'ok', response: {} },
          ]),
        );
      } else if (event === 'broadcast' && payload?.event) {
        this.publish(topic, payload.event, payload.payload, client.id);
      }
    });
  }

  // A client's broadcast over the socket, binary: kind, five lengths, the payload's encoding, then
  // join ref, ref, topic, event, metadata, and the payload (JSON when the encoding byte is 1).
  private onBinary(client: Client, message: Buffer) {
    const bytes = new Uint8Array(message);
    const [, joinRefLen, refLen, topicLen, eventLen, metaLen, encoding] = bytes;
    let at = 7 + joinRefLen! + refLen!;
    const text = new TextDecoder();
    const topic = text.decode(bytes.slice(at, (at += topicLen!)));
    const event = text.decode(bytes.slice(at, (at += eventLen!)));
    at += metaLen!;
    if (encoding !== 1) return;
    this.publish(
      topic,
      event,
      JSON.parse(text.decode(bytes.slice(at))),
      client.id,
    );
  }

  private async onHttp(page: Page, route: Route) {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (this.httpDown || this.cutOff.has(page))
      return route.fulfill({ status: 503, body: '{}' });
    const path = new URL(req.url()).pathname.replace(
      /^\/realtime\/v1\/api\/broadcast\/?/,
      '/',
    );
    if (path === '/') {
      // A send over the socket's own HTTP fallback, used while the socket is not open: a batch.
      const { messages = [] } = JSON.parse(req.postData() ?? '{}') as {
        messages?: { topic: string; event: string; payload: unknown }[];
      };
      for (const m of messages) this.publish(m.topic, m.event, m.payload);
      return route.fulfill({ status: 202, body: '{}' });
    }
    // A phone's httpSend: /<topic>/events/<event>, the body is the payload.
    const [, topic, , event] = path.split('/').map(decodeURIComponent);
    this.publish(topic!, event!, JSON.parse(req.postData() ?? 'null'));
    return route.fulfill({ status: 202, body: '{}' });
  }

  /** Answer for this page: its websocket, and the HTTP broadcast endpoint. */
  async attach(page: Page) {
    await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) =>
      this.onSocket(page, ws),
    );
    await page.route(
      (url) =>
        url.origin === SUPABASE &&
        url.pathname.startsWith('/realtime/v1/api/broadcast'),
      (route) => this.onHttp(page, route),
    );
  }

  /** Send a message into a topic as if a client had, for rooms bigger than the pages a check opens. */
  inject(topic: string, payload: unknown, event = 'room') {
    this.publish(topic, event, payload);
  }
}
