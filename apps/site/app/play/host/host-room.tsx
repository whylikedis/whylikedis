'use client';
// The big screen of a live room: the code and QR to join, the lobby, each round's claim and the
// replies to pick from, the reveal with the whole answer and its sources, and the podium. The
// room's rules are Interlace's (room-model, useRoom); the game's are @whylikedis/games
// (match-reply); this file only puts them on a screen.
import {
  dealMatchReply,
  MATCH_SECONDS,
  scoreMatchRound,
  type MatchRound,
  type ReplyCard,
} from '@whylikedis/games';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { AnswerPad, choiceKey } from '@/components/ui/games/answer-pad';
import { JoinCode } from '@/components/ui/games/join-code';
import { Leaderboard } from '@/components/ui/games/leaderboard';
import {
  RoomCountdown,
  RoomHostControls,
  RoomLobby,
  useRoom,
} from '@/components/ui/games/live-room';
import { Podium } from '@/components/ui/games/podium';
import {
  createRoom,
  makeJoinCode,
  roomStandings,
  type RoomEvent,
  type RoomHostEvent,
  type RoomState,
} from '@/components/ui/games/room-model';
import { TallyBars } from '@/components/ui/games/tally-bars';
import { tally } from '@/components/ui/games/tally-model';
import { TimerRing } from '@/components/ui/games/timer-ring';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import {
  MAX_PLAYERS,
  ROOMS_ACROSS_DEVICES,
  useRoomTransport,
} from '@/lib/rooms';

const HOST_ID = 'host';
const CODE_MINUTES = 60;

export function HostRoom({ cards }: { cards: ReplyCard[] }) {
  // The code and the deal are made in the browser, once, so a reload starts a new room.
  const [start, setStart] = useState<{
    room: RoomState;
    deck: MatchRound[];
  } | null>(null);
  useEffect(() => {
    const code = makeJoinCode();
    const deck = dealMatchReply(cards, code);
    setStart({
      deck,
      room: createRoom({
        code,
        hostId: HOST_ID,
        rounds: deck.length,
        codeExpiresAt: Date.now() + CODE_MINUTES * 60_000,
      }),
    });
  }, [cards]);

  if (!start) return <Typography tone="muted">Opening a room…</Typography>;
  if (start.deck.length < 2)
    return (
      <Callout tone="note" title="Not enough answers yet">
        A game needs at least two checked answers. More are on the way.
      </Callout>
    );
  return <Stage initial={start.room} deck={start.deck} />;
}

function Stage({ initial, deck }: { initial: RoomState; deck: MatchRound[] }) {
  const { transport, status } = useRoomTransport('host', initial.code);
  const { room, send } = useRoom({
    transport,
    selfId: HOST_ID,
    host: initial,
    settings: { maxPlayers: MAX_PLAYERS },
  });
  const roomRef = useRef(room!);
  roomRef.current = room!;

  // Every round's claim and replies travel with the host's `question`; the answer only with
  // `reveal`. The host controls send the bare events; this adds the round.
  const sendWithRound = useCallback(
    (event: RoomHostEvent) => {
      const r = roomRef.current;
      if (event.type === 'question') {
        const round = deck[r.round];
        send({ ...event, prompt: round?.prompt });
      } else if (event.type === 'reveal') {
        const round = deck[r.round - 1];
        send({ ...event, solution: round?.solution });
      } else send(event as RoomEvent);
    },
    [deck, send],
  );

  const score = useCallback(
    (r: RoomState) => {
      const round = deck[r.round - 1];
      if (!round || r.endsAt === null) return {};
      return scoreMatchRound(
        r.answers,
        r.players.map((p) => p.id),
        round.solution.correct,
        { openedAt: r.endsAt - round.prompt.seconds * 1000, endsAt: r.endsAt },
      );
    },
    [deck],
  );

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const href = `${origin}/play/join/?code=${initial.code}`;

  if (!room) return null;
  const round = room.round > 0 ? deck[room.round - 1] : undefined;
  const standings = roomStandings(room);

  const controls = (
    <RoomHostControls
      room={room}
      send={sendWithRound}
      roundSeconds={MATCH_SECONDS}
      score={score}
    />
  );

  return (
    <Stack gap="lg" data-phase={room.phase}>
      {!ROOMS_ACROSS_DEVICES && (
        <Callout tone="note" title="This preview plays in one browser">
          Open the join link in another tab to play. Rooms across phones switch
          on with the live service.
        </Callout>
      )}
      {status === 'retrying' && (
        <Callout tone="warn" title="Reconnecting">
          The room lost its connection for a moment. Players stay in.
        </Callout>
      )}

      {room.phase === 'lobby' && (
        <div className="grid gap-8 @container lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Stack gap="md">
            <Typography as="h1" variant="h1">
              Join on your phone
            </Typography>
            <Typography variant="long" tone="muted">
              Scan the code or type it at the address below. Each round shows
              something people say about Israel; pick the reply that answers it.
              Faster right answers score more.
            </Typography>
            {origin && (
              <JoinCode
                code={room.code}
                href={href}
                where={`${origin.replace(/^https?:\/\//, '')}/play`}
                size="stage"
                expiresAt={room.codeExpiresAt}
              />
            )}
          </Stack>
          <RoomLobby
            players={room.players}
            onRemove={(id) => sendWithRound({ type: 'remove', playerId: id })}
            actions={controls}
          />
        </div>
      )}

      {room.phase === 'countdown' && (
        <Stack gap="lg" className="items-center py-10 text-center">
          <Typography variant="ui-sm" tone="muted">
            {room.round === 0
              ? 'First round'
              : `Round ${room.round + 1} of ${room.rounds}`}
          </Typography>
          <RoomCountdown startsAt={room.startsAt} size="stage" />
          {controls}
        </Stack>
      )}

      {(room.phase === 'question' || room.phase === 'reveal') && round && (
        <RoundScreen room={room} round={round} controls={controls} />
      )}

      {room.phase === 'podium' && (
        <Stack gap="lg">
          <Typography as="h1" variant="h1">
            Final standings
          </Typography>
          <Podium
            entries={standings.map((e) => ({
              id: e.id,
              name: e.name,
              score: e.score,
            }))}
          />
          {controls}
        </Stack>
      )}

      {room.phase === 'closed' && (
        <Stack gap="md">
          <Typography as="h1" variant="h1">
            The game has ended
          </Typography>
          <Cluster gap="sm">
            <Button render={<Link href="/play/" />}>Host another game</Button>
            <Button variant="outline" render={<Link href="/answers/" />}>
              Read the answers
            </Button>
          </Cluster>
        </Stack>
      )}
    </Stack>
  );
}

function RoundScreen({
  room,
  round,
  controls,
}: {
  room: RoomState;
  round: MatchRound;
  controls: React.ReactNode;
}) {
  const revealed = room.phase === 'reveal';
  const { prompt, solution } = round;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of Object.values(room.answers))
      if (typeof a.value === 'string') c[a.value] = (c[a.value] ?? 0) + 1;
    return c;
  }, [room.answers]);
  const spread = tally(
    prompt.choices.map((c) => c.id),
    counts,
  );
  const standings = roomStandings(room);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Stack gap="lg">
        <Cluster gap="sm" className="justify-between">
          <Cluster gap="sm">
            <Badge variant="outline">
              Round {prompt.round} of {prompt.rounds}
            </Badge>
            {prompt.chapter && (
              <Typography variant="ui-sm" tone="muted">
                {prompt.chapter}
              </Typography>
            )}
          </Cluster>
          {!revealed && (
            <TimerRing
              seconds={prompt.seconds}
              deadline={room.endsAt}
              size="lg"
            />
          )}
        </Cluster>
        <Stack gap="xs">
          <Typography variant="ui-sm" tone="muted">
            Someone says
          </Typography>
          <Typography as="h1" variant="h1" className="text-balance">
            “{prompt.claim}”
          </Typography>
        </Stack>
        <Typography variant="ui" tone="muted">
          Which reply answers it?
        </Typography>
        {/* The big screen shows the same lettered tiles as the phones, read only. */}
        <AnswerPad
          choices={prompt.choices.map((c) => ({ id: c.id, label: c.text }))}
          value={null}
          closed
          correct={revealed ? solution.correct : null}
          labels={{
            group: 'Replies',
            closed: '',
            result: () => '',
          }}
        />
        {revealed && (
          <Stack gap="md">
            <TallyBars
              rows={spread.rows}
              optionLabels={Object.fromEntries(
                prompt.choices.map((c, i) => [c.id, choiceKey(i)]),
              )}
              marks={{ [solution.correct]: 'correct' }}
              labels={{ total: (n) => (n === 1 ? '1 answer' : `${n} answers`) }}
            />
            <Stack gap="sm">
              <Typography variant="h3" as="h2">
                The whole answer
              </Typography>
              {solution.lines.map((l, i) => (
                <Typography key={i} variant="body">
                  {l}
                </Typography>
              ))}
              {solution.sources.length > 0 && (
                <Typography variant="ui-sm" tone="muted">
                  {solution.sources.length}{' '}
                  {solution.sources.length === 1 ? 'source' : 'sources'},
                  including{' '}
                  {[...new Set(solution.sources.map((s) => s.publisher))]
                    .slice(0, 4)
                    .join(', ')}
                  .{' '}
                  <Link
                    href={solution.href}
                    className="underline underline-offset-4"
                  >
                    All of them on the answer page
                  </Link>
                </Typography>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
      <Stack gap="md">
        {controls}
        {revealed && standings.length > 0 && (
          <Leaderboard
            caption="Standings"
            showCaption
            entries={standings.slice(0, 8).map((e) => ({
              id: e.id,
              name: e.name,
              score: e.score,
            }))}
          />
        )}
      </Stack>
    </div>
  );
}
