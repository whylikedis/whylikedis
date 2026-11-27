'use client';
// A practice round of "What would you say?": a few cards in a row from reviewed answers, the ones
// the reader has not got yet first. The round is the app's (@whylikedis/games: the same deal, the
// same session engine, the same XP), dealt in the browser once the reader's history has loaded,
// and every answer goes into the same log as today's question.
import {
  currentItem,
  dayKey,
  modeOf,
  progressBetween,
  startSession,
  step,
  summarize,
  whatWouldYouSay,
  type Action,
  type DayKey,
  type GameEvent,
  type Rating,
  type Session,
} from '@whylikedis/games';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LevelMeter } from '@/components/ui/games/level-meter';
import { RecallCard } from '@/components/ui/games/recall-card';
import { RoundSummary } from '@/components/ui/games/round-summary';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { capture } from '@/lib/analytics';
import { usePlayer } from '@/lib/player';
import { CardAnswer, heardOf } from '../card-answer';
import type { DailyCard } from '../daily-question';

const game = whatWouldYouSay<DailyCard>();
const PRACTICE = modeOf(game, 'practice')!;
const RATINGS = [
  { id: 'had-it', label: 'I had it', status: 'Marked as one you had.' },
  { id: 'not-yet', label: 'Not yet', status: 'Marked to come back to.' },
];

type Round = {
  session: Session<DailyCard, Rating>;
  day: DayKey;
  // The log when the round began, so the summary shows what this round changed.
  start: readonly GameEvent[];
};

export function PracticeRound({ cards }: { cards: DailyCard[] }) {
  const player = usePlayer();
  const [round, setRound] = useState<Round | null>(null);
  const roundRef = useRef<Round | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const deal = useCallback(() => {
    const day = dayKey();
    const items = game.deal({
      content: cards,
      history: player.history,
      day,
      mode: PRACTICE,
    });
    const next = {
      session: startSession(game, PRACTICE, items),
      day,
      start: player.events,
    };
    roundRef.current = next;
    setRound(next);
    capture('practice_started', { items: items.length });
  }, [cards, player.history, player.events]);

  // Deal once the reader's history is in, so the round puts what they missed first.
  useEffect(() => {
    if (player.ready && !roundRef.current) deal();
  }, [player.ready, deal]);

  const dispatch = useCallback(
    (action: Action<Rating>) => {
      const cur = roundRef.current;
      if (!cur) return;
      const next = step(game, cur.session, action);
      if (next === cur.session) return;
      const where = { game: game.id, mode: PRACTICE.id, day: cur.day };
      if (next.answered.length > cur.session.answered.length) {
        const a = next.answered[next.answered.length - 1];
        player.recordAnswer(where, a.item.id, a.score);
        // The next card takes the place of this one: take focus to its heading.
        requestAnimationFrame(() => headingRef.current?.focus());
      }
      if (next.phase === 'done' && cur.session.phase !== 'done') {
        const s = summarize(next);
        player.recordRound(where, { points: s.points, max: s.max }, s.answered);
      }
      roundRef.current = { ...cur, session: next };
      setRound(roundRef.current);
    },
    [player],
  );

  const session = round?.session;
  const card = session ? currentItem(session) : undefined;
  const finished = !!session && session.phase === 'done';
  const progress = useMemo(
    () =>
      round && finished
        ? progressBetween(round.start, player.events, round.day, player.goal)
        : null,
    [round, finished, player.events, player.goal],
  );

  // Once, when the round is in the log: what it earned.
  const told = useRef<Round | null>(null);
  useEffect(() => {
    if (!progress || !round || told.current === round) return;
    if (progress.xp.gained === 0 && round.session.items.length > 0) return;
    told.current = round;
    const s = summarize(round.session);
    capture('practice_finished', {
      items: s.answered,
      points: s.points,
      xp: progress.xp.gained,
    });
    if (progress.xp.gained > 0)
      capture('xp_earned', {
        source: 'practice',
        xp: progress.xp.gained,
        total: progress.xp.total,
        level: progress.xp.level.level,
      });
    if (progress.xp.levelsUp > 0)
      capture('level_up', { level: progress.xp.level.level });
    if (progress.goal.metNow)
      capture('goal_met', {
        goal: player.goal ?? 'light',
        xp: progress.goal.earned,
      });
  }, [progress, round, player.goal]);

  if (!session) {
    return (
      <Typography variant="body" tone="muted" aria-live="polite">
        Getting your round ready.
      </Typography>
    );
  }

  if (session.items.length === 0) {
    return (
      <Stack gap="md">
        <Typography variant="h1">Practice</Typography>
        <Typography variant="body" tone="muted">
          No reviewed answers to practise with yet. Today&rsquo;s question is
          waiting.
        </Typography>
        <Button render={<Link href="/daily/" />}>Today&rsquo;s question</Button>
      </Stack>
    );
  }

  if (finished && progress) {
    const s = summarize(session);
    return (
      <RoundSummary
        title="Practice round done"
        headingLevel={2}
        focusOnMount
        description={`You had ${s.points} of ${s.answered}. ${
          s.perfect
            ? 'Every one.'
            : 'The ones you did not get come back first next time.'
        }`}
        xp={progress.xp.gained}
        goal={{ earned: progress.goal.earned, goal: progress.goal.xp }}
        highlight={progress.highlight}
      >
        <Card>
          <CardContent>
            <LevelMeter xp={progress.xp.total} gained={progress.xp.gained} />
          </CardContent>
        </Card>
        <Cluster gap="sm">
          <Button onClick={deal}>Another round</Button>
          <Button variant="outline" render={<Link href="/daily/" />}>
            Back to today&rsquo;s question
          </Button>
        </Cluster>
      </RoundSummary>
    );
  }

  if (!card) return null;
  const heard = heardOf(card);
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Typography variant="h1">Practice</Typography>
        <Typography variant="ui-sm" tone="muted" aria-live="polite">
          Question {session.index + 1} of {session.items.length}
        </Typography>
      </Stack>
      <Card>
        <CardContent>
          <Stack gap="md">
            <Cluster gap="xs">
              <Badge variant="outline">{card.chapter}</Badge>
            </Cluster>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-muted-foreground text-sm outline-none"
            >
              {heard.who}
            </h2>
            <RecallCard
              key={`${session.index}-${card.id}`}
              prompt={heard.prompt}
              revealed={session.phase === 'revealed'}
              onReveal={() => dispatch({ type: 'reveal' })}
              rating={null}
              onRate={(r) =>
                dispatch({
                  type: 'answer',
                  answer: r === 'had-it' ? 'had-it' : 'not-yet',
                })
              }
              ratings={RATINGS}
              labels={{
                hint: 'What would you say back? Think of your reply, then check it.',
                rate: 'Did you have it?',
              }}
              answer={<CardAnswer card={card} />}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
