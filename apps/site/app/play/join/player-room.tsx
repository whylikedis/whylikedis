'use client';
// A player's phone in a live room: type the code (or arrive from the QR with it), pick a name, wait
// in the lobby, pick a reply each round, see how you did, and the podium. The phone never learns
// the right reply before the host reveals it.
import {
  readMatchPrompt,
  readMatchSolution,
  type MatchPrompt,
} from '@whylikedis/games';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { AnswerPad, choiceKey } from '@/components/ui/games/answer-pad';
import {
  RoomCountdown,
  RoomLobby,
  useRoom,
  useSecondsLeft,
} from '@/components/ui/games/live-room';
import { Podium } from '@/components/ui/games/podium';
import {
  cleanName,
  formatJoinCode,
  normalizeJoinCode,
  roomStandings,
  type RoomRejection,
  type RoomState,
} from '@/components/ui/games/room-model';
import { TimerRing } from '@/components/ui/games/timer-ring';
import { Input } from '@/components/ui/input';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import {
  ROOMS_ACROSS_DEVICES,
  saveName,
  savedName,
  useDeviceId,
  useRoomTransport,
} from '@/lib/rooms';

const REJECTED: Partial<Record<RoomRejection, string>> = {
  locked: 'The host has locked the room. Ask them to open it.',
  expired: 'This code has run out. Ask the host for a new one.',
  full: 'The room is full.',
  removed: 'The host removed you from this room.',
  'name-empty': 'Type a name first.',
  'name-taken': 'Someone in the room has that name. Try another.',
  closed: 'This game has ended.',
};

const ordinal = (n: number) => {
  const rule = new Intl.PluralRules('en-US', { type: 'ordinal' }).select(n);
  return `${n}${{ one: 'st', two: 'nd', few: 'rd' }[rule as 'one'] ?? 'th'}`;
};

export function PlayerRoom({ initialCode }: { initialCode: string | null }) {
  const code = initialCode ? normalizeJoinCode(initialCode) : null;
  return code ? <Room code={code} /> : <CodeForm bad={!!initialCode} />;
}

export function CodeForm({ bad }: { bad: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState(
    bad ? 'That code does not look right.' : '',
  );
  return (
    <form
      className="grid max-w-prose gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = normalizeJoinCode(value);
        if (!code) return setError('A code has six letters and numbers.');
        router.push(`/play/join/?code=${code}`);
      }}
    >
      <label htmlFor="room-code" className="grid gap-2">
        <Typography variant="ui">The code on the big screen</Typography>
        <Input
          id="room-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder="K7Q 4MZ"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'room-code-error' : undefined}
          className="font-mono text-2xl tracking-widest uppercase"
        />
      </label>
      {error && (
        <Typography id="room-code-error" variant="ui-sm" tone="destructive">
          {error}
        </Typography>
      )}
      <div>
        <Button type="submit" size="lg">
          Join
        </Button>
      </div>
    </form>
  );
}

function Room({ code }: { code: string }) {
  const selfId = useDeviceId();
  const { transport, status } = useRoomTransport(
    'player',
    selfId ? code : null,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const { room, send } = useRoom({
    transport,
    selfId: selfId ?? '',
    code,
    onRejected: (reason) => setProblem(REJECTED[reason] ?? null),
  });
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  useEffect(() => setName(savedName()), []);

  const inRoom =
    !!room && !!selfId && room.players.some((p) => p.id === selfId);

  // A join can cross a dropped message: ask again until the host has us, a few times.
  const tries = useRef(0);
  useEffect(() => {
    if (!joining || inRoom || problem || !selfId) return;
    if (tries.current >= 5) return;
    const t = setTimeout(() => {
      tries.current++;
      send({ type: 'join', playerId: selfId, name });
    }, 2500);
    return () => clearTimeout(t);
  });

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean || !selfId) return setProblem(REJECTED['name-empty']!);
    setProblem(null);
    saveName(clean);
    tries.current = 0;
    setJoining(true);
    send({ type: 'join', playerId: selfId, name: clean });
  };

  const header = (
    <Cluster gap="sm" className="justify-between">
      <Typography variant="ui-sm" tone="muted">
        Room <span className="font-mono">{formatJoinCode(code)}</span>
      </Typography>
      {status === 'retrying' && (
        <Typography variant="ui-sm" tone="muted" role="status">
          Reconnecting…
        </Typography>
      )}
    </Cluster>
  );

  if (!room)
    return (
      <Stack gap="md">
        {header}
        <Typography tone="muted" role="status">
          {ROOMS_ACROSS_DEVICES
            ? 'Finding the room…'
            : 'Finding the room… In this preview, the host must be open in another tab of this browser.'}
        </Typography>
        <Button variant="outline" render={<Link href="/play/join/" />}>
          Type another code
        </Button>
      </Stack>
    );

  if (!inRoom)
    return (
      <Stack gap="md">
        {header}
        {room.phase === 'closed' ? (
          <Typography>This game has ended.</Typography>
        ) : (
          <form onSubmit={join} className="grid max-w-prose gap-4">
            <label htmlFor="player-name" className="grid gap-2">
              <Typography as="h1" variant="h2">
                Your name for this game
              </Typography>
              <Typography variant="ui-sm" tone="muted">
                Everyone in the room sees it. A first name or a nickname is
                fine.
              </Typography>
              <Input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                autoComplete="nickname"
                className="text-lg"
              />
            </label>
            {problem && (
              <Typography variant="ui-sm" tone="destructive" role="alert">
                {problem}
              </Typography>
            )}
            <div>
              <Button type="submit" size="lg" loading={joining && !problem}>
                Join the game
              </Button>
            </div>
          </form>
        )}
      </Stack>
    );

  return (
    <Stack gap="lg" data-phase={room.phase}>
      {header}
      <InRoom room={room} selfId={selfId!} send={send} />
    </Stack>
  );
}

function InRoom({
  room,
  selfId,
  send,
}: {
  room: RoomState;
  selfId: string;
  send: ReturnType<typeof useRoom>['send'];
}) {
  const standings = roomStandings(room);
  const me = standings.find((e) => e.id === selfId);
  const prompt = readMatchPrompt(room.prompt);
  const solution = readMatchSolution(room.solution);

  switch (room.phase) {
    case 'lobby':
      return (
        <RoomLobby
          players={room.players}
          selfId={selfId}
          hideAway
          labels={{ waiting: 'You are in. The game starts on the big screen.' }}
        />
      );
    case 'countdown':
      return (
        <Stack gap="md" className="items-center py-8 text-center">
          <Typography variant="ui" tone="muted">
            Get ready
          </Typography>
          <RoomCountdown startsAt={room.startsAt} />
        </Stack>
      );
    case 'question':
    case 'reveal':
      return prompt ? (
        <Round
          room={room}
          prompt={prompt}
          correct={room.phase === 'reveal' ? (solution?.correct ?? null) : null}
          selfId={selfId}
          onPick={(id) =>
            send({
              type: 'answer',
              playerId: selfId,
              value: id,
              at: Date.now(),
            })
          }
          after={
            room.phase === 'reveal' && (
              <Stack gap="sm">
                {me && (
                  <Typography variant="ui" role="status">
                    You are {ordinal(me.rank)} of {standings.length}, with{' '}
                    {me.score.toLocaleString('en-US')} points.
                  </Typography>
                )}
                {solution && (
                  <Link
                    href={solution.href}
                    target="_blank"
                    className="text-primary underline underline-offset-4"
                  >
                    Read the whole answer and its sources
                  </Link>
                )}
              </Stack>
            )
          }
        />
      ) : (
        <Typography tone="muted">Watch the big screen.</Typography>
      );
    case 'podium':
      return (
        <Stack gap="md">
          <Typography as="h1" variant="h2">
            {me ? `You finished ${ordinal(me.rank)}` : 'Final standings'}
          </Typography>
          <Podium
            entries={standings.map((e) => ({
              id: e.id,
              name: e.name,
              score: e.score,
            }))}
            currentId={selfId}
          />
          <Button variant="outline" render={<Link href="/daily/" />}>
            Play today’s question
          </Button>
        </Stack>
      );
    default:
      return (
        <Stack gap="md">
          <Typography as="h1" variant="h2">
            The game has ended
          </Typography>
          <Button variant="outline" render={<Link href="/answers/" />}>
            Read the answers
          </Button>
        </Stack>
      );
  }
}

function Round({
  room,
  prompt,
  correct,
  selfId,
  onPick,
  after,
}: {
  room: RoomState;
  prompt: MatchPrompt;
  correct: string | null;
  selfId: string;
  onPick: (id: string) => void;
  after: React.ReactNode;
}) {
  // What this phone picked shows at once; the host's copy confirms it.
  const [picked, setPicked] = useState<{ round: number; id: string } | null>(
    null,
  );
  const answered = room.answers[selfId]?.value;
  const value =
    typeof answered === 'string'
      ? answered
      : picked?.round === room.round
        ? picked.id
        : null;
  const left = useSecondsLeft(room.phase === 'question' ? room.endsAt : null);
  return (
    <Stack gap="md">
      <Cluster gap="sm" className="justify-between">
        <Typography variant="ui-sm" tone="muted">
          Round {prompt.round} of {prompt.rounds}
        </Typography>
        {room.phase === 'question' && room.endsAt !== null && (
          <TimerRing
            seconds={prompt.seconds}
            deadline={room.endsAt}
            size="sm"
          />
        )}
      </Cluster>
      <Typography as="h1" variant="h3" className="text-balance">
        “{prompt.claim}”
      </Typography>
      <AnswerPad
        choices={prompt.choices.map((c) => ({ id: c.id, label: c.text }))}
        value={value}
        closed={left === 0}
        correct={correct}
        points={correct ? (room.lastPoints[selfId] ?? 0) : null}
        locale="en-US"
        labels={{
          group: 'Which reply answers it?',
          result: ({ outcome, points }) => {
            const i = prompt.choices.findIndex((c) => c.id === correct);
            const right = `The right reply was ${choiceKey(i)}.`;
            return outcome === 'correct'
              ? `Right. +${(points ?? 0).toLocaleString('en-US')} points.`
              : outcome === 'missed'
                ? `No answer this time. ${right}`
                : `Not this time. ${right}`;
          },
        }}
        onPick={(id) => {
          setPicked({ round: room.round, id });
          onPick(id);
        }}
      />
      {after}
    </Stack>
  );
}
