'use client';
// Today's "What would you say?": one thing people say about Israel, the reader's own reply in
// their head, then the answer and its sources, and an honest "I had it" or "Not yet". The rules
// (which card a day gets, what a rating scores, what counts toward the streak) are the app's, from
// @whylikedis/games; this file only shows them.
import {
  dailyCard,
  dayKey,
  daysBetween,
  FIRST_DAY,
  progressBetween,
  PROTECTION,
  puzzleNumber,
  STREAK_MILESTONES,
  whatWouldYouSay,
  WWYS,
  type DayKey,
} from '@whylikedis/games';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DailyPuzzle,
  DailyPuzzleCountdown,
} from '@/components/ui/games/daily-puzzle';
import { RecallCard } from '@/components/ui/games/recall-card';
import { LevelMeter } from '@/components/ui/games/level-meter';
import { Milestones } from '@/components/ui/games/milestones';
import { ReminderOffer } from '@/components/ui/games/reminder-offer';
import { RoundSummary } from '@/components/ui/games/round-summary';
import { ShareCard } from '@/components/ui/games/share-card';
import { Streak } from '@/components/ui/games/streak';
import { summarizeStreak } from '@/components/ui/games/streak-model';
import { Cluster, Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { capture } from '@/lib/analytics';
import { usePlayer } from '@/lib/player';
import { SESSIONS_DESCRIPTION } from '../sessions/copy';

export type DailyCard = {
  id: string;
  chapter: string;
  claim: string;
  heard: { who?: string; quote: string } | null;
  lines: string[];
  sources: string[];
  verified: boolean;
};

const game = whatWouldYouSay<DailyCard>();
const RATINGS = [
  { id: 'had-it', label: 'I had it', status: 'Marked as one you had.' },
  {
    id: 'not-yet',
    label: 'Not yet',
    status: 'Marked as one to come back to.',
  },
];
const SHARE_MARKS = { 'had-it': '🟩', 'not-yet': '🟨' };
const SHARE_WORDS = { 'had-it': 'had it', 'not-yet': 'not yet' };
// Whether the reader added or dismissed the calendar reminder. Either way it is not offered again.
const REMINDER_KEY = 'wld.reminder';

export function DailyQuestion({
  cards,
  initialDay,
  description,
}: {
  cards: DailyCard[];
  initialDay: DayKey;
  description: string;
}) {
  const [day, setDay] = useState(initialDay);
  // The reader's own calendar day, once the browser can tell.
  useEffect(() => setDay(dayKey()), []);

  const player = usePlayer();
  const card = useMemo(() => dailyCard(cards, day), [cards, day]);
  const number = puzzleNumber(day, FIRST_DAY);
  const played = player.history.playedDays(WWYS, 'daily');
  const stored = useMemo(
    () =>
      card
        ? player.events.find(
            (e) =>
              e.kind === 'answer' &&
              e.game === WWYS &&
              e.mode === 'daily' &&
              e.day === day &&
              e.item === card.id,
          )
        : undefined,
    [player.events, card, day],
  );
  const storedRating = stored
    ? stored.score.points >= stored.score.max
      ? 'had-it'
      : 'not-yet'
    : null;
  const [revealed, setRevealed] = useState(false);
  const rated = storedRating !== null;
  // Today's progress: what today's play changed against the log before today. The rules are
  // @whylikedis/games' (the app reads the same), the arithmetic Interlace's.
  const progress = useMemo(
    () =>
      progressBetween(
        player.events.filter((e) => e.day < day),
        player.events,
        day,
        player.goal,
      ),
    [player.events, day, player.goal],
  );
  const streak = progress.streak;
  const milestone = progress.milestones.at(-1);
  // True only for the rating made on this visit, so a reload does not celebrate again.
  const [justRated, setJustRated] = useState(false);
  const [reminder, setReminder] = useState<'unknown' | 'offer' | 'closed'>(
    'unknown',
  );
  useEffect(() => {
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(REMINDER_KEY);
    } catch {
      // Storage blocked: offer it; dismissing then lasts for this page only.
    }
    setReminder(v ? 'closed' : 'offer');
  }, []);
  // Added stays on screen to say so; dismissed goes at once. Neither is offered again.
  const closeReminder = (how: 'added' | 'dismissed') => {
    if (how === 'dismissed') setReminder('closed');
    try {
      window.localStorage.setItem(REMINDER_KEY, how);
    } catch {
      // Kept for this page only.
    }
  };

  // One "viewed" per day the page shows, once the history has loaded.
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!player.ready || !card || viewed.current === day) return;
    viewed.current = day;
    const before = played.filter((d) => d < day);
    const last = before.at(-1);
    capture('daily_viewed', {
      puzzle: number,
      played_before: before.length > 0,
      days_since_last_play: last ? daysBetween(last, day) : null,
      streak: streak.current,
      already_played_today: played.includes(day),
      level: progress.xp.level.level,
      shields: streak.shields,
    });
  }, [player.ready, card, day, played, number, streak, progress]);

  // Once the rating made on this visit is in the log, say what it earned, once.
  const told = useRef(false);
  useEffect(() => {
    if (!justRated || told.current || !played.includes(day)) return;
    told.current = true;
    capture('xp_earned', {
      source: 'daily',
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
    for (const value of progress.milestones)
      capture('milestone_reached', { kind: 'streak', value });
  }, [justRated, played, day, progress, player.goal]);

  const reveal = () => {
    setRevealed(true);
    capture('daily_revealed', { puzzle: number });
  };

  const rate = (rating: string) => {
    if (!card || rated) return;
    const where = { game: WWYS, mode: 'daily', day };
    const score = game.judge(card, rating === 'had-it' ? 'had-it' : 'not-yet');
    player.recordAnswer(where, card.id, score);
    player.recordRound(where, score, 1);
    capture('daily_rated', { puzzle: number, rating });
    setJustRated(true);
    if (!played.includes(day)) {
      const next = summarizeStreak(
        [...played, day],
        day,
        undefined,
        PROTECTION,
      );
      capture('streak_extended', { length: next.current, best: next.best });
    }
  };

  const url =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/daily/`;

  return (
    <Stack gap="lg">
      <DailyPuzzle
        title="What would you say?"
        headingLevel={1}
        number={number > 0 ? number : undefined}
        day={day}
        rounds={1}
        round={1}
        done={rated}
        aside={
          player.ready ? (
            <Streak variant="compact" played={played} today={day} />
          ) : null
        }
      >
        <Stack gap="lg">
          <Typography variant="long" tone="muted">
            {description}
          </Typography>
          {card ? (
            <Card>
              <CardContent>
                <Stack gap="md">
                  <Cluster gap="xs">
                    <Badge variant="outline">{card.chapter}</Badge>
                    {card.verified ? null : (
                      <Badge variant="warning">Still being checked</Badge>
                    )}
                  </Cluster>
                  <Typography variant="ui-sm" tone="muted">
                    {card.heard?.who
                      ? `${card.heard.who} says`
                      : 'Someone says'}
                  </Typography>
                  <RecallCard
                    key={card.id}
                    // In quotes: it is the claim people hear, which the answer checks, not ours.
                    prompt={
                      card.heard ? `“${card.heard.quote}”` : `“${card.claim}”`
                    }
                    revealed={revealed || rated}
                    onReveal={reveal}
                    rating={storedRating}
                    onRate={rate}
                    ratings={RATINGS}
                    labels={{
                      hint: 'What would you say back? Think of your reply, then check it.',
                      rate: 'Did you have it?',
                    }}
                    answer={
                      <Stack gap="sm">
                        <Typography variant="h3" as="p">
                          {card.claim}
                        </Typography>
                        {card.lines.map((line, i) => (
                          <Typography key={i} variant="body">
                            {line}
                          </Typography>
                        ))}
                        {card.sources.length ? (
                          <Typography variant="caption" tone="muted">
                            Sources: {card.sources.join(', ')}
                          </Typography>
                        ) : null}
                        {card.verified ? (
                          <Link
                            href={`/answers/${card.id}/`}
                            className="text-primary text-sm font-medium underline underline-offset-4"
                          >
                            The full answer and every quote
                          </Link>
                        ) : null}
                      </Stack>
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Typography variant="body" tone="muted">
              No question today yet. Come back tomorrow.
            </Typography>
          )}
        </Stack>
      </DailyPuzzle>

      {rated && card ? (
        <Stack gap="lg">
          <RoundSummary
            title={justRated ? 'Today’s question, done' : 'You’ve played today'}
            description={
              storedRating === 'had-it'
                ? 'You had it. A new one is waiting tomorrow.'
                : 'Not yet, and that is the honest answer. It comes back in practice.'
            }
            xp={progress.xp.gained}
            goal={{ earned: progress.goal.earned, goal: progress.goal.xp }}
            streak={{ current: streak.current, extended: streak.extended }}
            highlight={progress.highlight}
            celebrate={justRated}
            labels={{ xp: justRated ? 'XP earned' : 'XP today' }}
          >
            <ShareCard
              title="What would you say?"
              number={number > 0 ? number : undefined}
              results={[storedRating!]}
              symbols={SHARE_MARKS}
              bandLabels={SHARE_WORDS}
              note={
                milestone !== undefined ? `${milestone}-day streak` : undefined
              }
              streak={milestone !== undefined ? undefined : streak.current}
              url={url}
              onShare={(method) =>
                capture('daily_shared', {
                  puzzle: number,
                  method,
                  kind: milestone !== undefined ? 'milestone' : 'result',
                })
              }
            />
          </RoundSummary>
          <DailyPuzzleCountdown onNextDay={() => setDay(dayKey())} />
          <Stack gap="sm">
            <Typography variant="h3" as="h2">
              While you wait for tomorrow
            </Typography>
            <Typography variant="body" tone="muted">
              {SESSIONS_DESCRIPTION}
            </Typography>
            <Cluster gap="sm">
              <Button
                render={<Link href="/sessions/" />}
                onClick={() =>
                  capture('daily_next_tapped', {
                    puzzle: number,
                    target: 'sessions',
                  })
                }
              >
                Book a session
              </Button>
              <Button
                variant="outline"
                render={<Link href="/facts/" />}
                onClick={() =>
                  capture('daily_next_tapped', {
                    puzzle: number,
                    target: 'answers',
                  })
                }
              >
                Read more answers
              </Button>
            </Cluster>
          </Stack>
        </Stack>
      ) : null}

      {player.ready && played.length > 0 ? (
        <Stack gap="md">
          <Typography variant="h3" as="h2">
            Your progress
          </Typography>
          <Card>
            <CardContent>
              <Stack gap="lg">
                <LevelMeter
                  xp={progress.xp.total}
                  gained={justRated ? progress.xp.gained : 0}
                />
                <Streak played={played} today={day} protection={PROTECTION} />
                <Milestones
                  value={streak.current}
                  steps={STREAK_MILESTONES}
                  show={4}
                  labels={{
                    list: 'Streak milestones',
                    step: (n, f) => (n === 1 ? '1 day' : `${f} days`),
                    next: (left, step) =>
                      `${left} more ${left === '1' ? 'day' : 'days'} to ${step}`,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
          {reminder === 'offer' && played.length >= 2 ? (
            <ReminderOffer
              event="What would you say? Today’s question"
              eventDescription="One thing people say about Israel, and the answer with its sources. Two minutes."
              url={url}
              uid="daily-question@whylikedis"
              fileName="whylikedis-daily.ics"
              labels={{
                body: 'Add a daily reminder to your own calendar. Nothing is sent to us, and you can remove it there any time.',
              }}
              onAdd={(time) => {
                capture('reminder_added', { hour: Number(time.slice(0, 2)) });
                closeReminder('added');
              }}
              onDismiss={() => {
                capture('reminder_dismissed', {});
                closeReminder('dismissed');
              }}
            />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
