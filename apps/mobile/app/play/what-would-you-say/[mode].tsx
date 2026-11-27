// A round of "What would you say?": one card for the daily game, five for practice. For each, the
// claim someone makes, a moment to think, the answer with its sources, and an honest "I had it" or
// "Not yet". The rules are in lib/games/what-would-you-say.ts and the flow in the engine; this
// screen only draws them.
import type { PackCard } from '@whylikedis/content';
import * as Haptics from 'expo-haptics';
import {
  Redirect,
  router,
  useLocalSearchParams,
  type ErrorBoundaryProps,
} from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Share, View } from 'react-native';
import { shareText } from '../../../interlace/games/share-model';
import {
  Badge,
  Button,
  Card,
  LevelMeter,
  Reveal,
  RoundSummary,
  Screen,
  Stack,
  StreakStrip,
  Text,
} from '../../../interlace/native';
import { capture } from '../../../lib/analytics';
import { ScreenError } from '../../../lib/errors/fallback';
import {
  FIRST_DAY,
  PROTECTION,
  progressBetween,
  puzzleNumber,
  shareSlug,
  whatWouldYouSay,
  type Rating,
} from '@whylikedis/games';
import { streakLabel } from '../../../lib/games/labels';
import { cards, shortName } from '../../../lib/pack';
import { usePlayer } from '../../../lib/player';
import { roundMode } from '../../../lib/route-params';
import { useGameSession } from '../../../lib/use-game-session';

const game = whatWouldYouSay<PackCard>();

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ScreenError {...props} where="play/what-would-you-say" />;
}

// An address that names no round (a stale or mistyped link) goes home; it is never played as the
// daily, which would count toward the streak.
export default function RoundRoute() {
  const { mode } = useLocalSearchParams<{ mode: string | string[] }>();
  const id = roundMode(mode);
  return id ? <Round mode={id} /> : <Redirect href="/" />;
}

function Round({ mode }: { mode: 'daily' | 'practice' }) {
  const { history, events, goal } = usePlayer();
  // The log as it was when the round began, so the summary shows what this round changed.
  const start = useRef(events).current;
  const {
    session,
    item: card,
    summary,
    day,
    reveal,
    answer,
  } = useGameSession(game, mode, cards);
  const daily = session.mode.daily;

  const rate = useCallback(
    (rating: Rating) => {
      answer(rating);
      Haptics.notificationAsync(
        rating === 'had-it'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    },
    [answer],
  );

  const sources = useMemo(
    () =>
      card
        ? [
            ...new Set(
              card.lines.flatMap((l) =>
                l.sources.map((s) => shortName(s.publisher)),
              ),
            ),
          ]
        : [],
    [card],
  );

  const finished = !card && session.items.length > 0;
  const progress = useMemo(
    () => (finished ? progressBetween(start, events, day, goal) : null),
    [finished, start, events, day, goal],
  );

  // Once, when the round is in the log: what it earned, and a tap on the phone for news.
  const told = useRef(false);
  useEffect(() => {
    if (!progress || told.current || progress.xp.gained === 0) return;
    told.current = true;
    capture('round_finished', {
      mode: session.mode.id,
      items: summary.answered,
      points: summary.points,
      xp: progress.xp.gained,
    });
    capture('xp_earned', {
      source: session.mode.id,
      xp: progress.xp.gained,
      total: progress.xp.total,
      level: progress.xp.level.level,
    });
    if (progress.xp.levelsUp > 0)
      capture('level_up', { level: progress.xp.level.level });
    if (progress.goal.metNow)
      capture('goal_met', { goal: goal ?? 'light', xp: progress.goal.earned });
    for (const value of progress.milestones)
      capture('milestone_reached', { kind: 'streak', value });
    if (progress.highlight)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
  }, [progress, session.mode.id, summary, goal]);

  const share = useCallback(() => {
    if (!progress) return;
    const milestone = progress.milestones.at(-1);
    const n = puzzleNumber(day, FIRST_DAY);
    const firstAnswer = session.answered[0];
    const first: Rating | undefined = firstAnswer
      ? firstAnswer.score.points >= firstAnswer.score.max
        ? 'had-it'
        : 'not-yet'
      : undefined;
    const message = shareText({
      title: 'What would you say?',
      number: daily && n > 0 ? n : undefined,
      results: session.answered.map((a) =>
        a.score.points >= a.score.max ? 'had-it' : 'not-yet',
      ),
      symbols: { 'had-it': '🟩', 'not-yet': '🟨' },
      note: milestone ? `${milestone}-day streak` : undefined,
      streak: milestone ? undefined : progress.streak.current,
      // A daily result links to its own page, which unfurls into a picture of the result.
      url:
        daily && first
          ? `https://www.whylikedis.fyi/daily/s/${shareSlug(first, milestone)}/`
          : 'https://www.whylikedis.fyi/daily/',
    });
    Share.share({ message })
      .then((r) => {
        if (r.action === Share.sharedAction)
          capture('shared', {
            kind: milestone ? 'milestone' : 'result',
            mode: session.mode.id,
          });
      })
      .catch(() => {});
  }, [progress, day, daily, session]);

  if (!card) {
    const total = session.items.length;
    if (progress) {
      return (
        <Screen scroll>
          <RoundSummary
            title={daily ? "Today's question, done" : 'Round done'}
            description={
              daily
                ? summary.perfect
                  ? 'You had it. A new one is waiting tomorrow.'
                  : 'Not yet, and that is the honest answer. It comes back in practice.'
                : `You had ${summary.points} of ${total}. ${
                    summary.perfect
                      ? 'Every one.'
                      : 'The ones you did not get come back first next time.'
                  }`
            }
            xp={progress.xp.gained}
            goal={{
              earned: progress.goal.earned,
              earnedBefore: progress.goal.earnedBefore,
              goal: progress.goal.xp,
            }}
            streak={
              daily
                ? {
                    current: progress.streak.current,
                    extended: progress.streak.extended,
                  }
                : undefined
            }
            highlight={progress.highlight}
          >
            <Card>
              <LevelMeter xp={progress.xp.total} gained={progress.xp.gained} />
            </Card>
            {daily ? (
              <Card>
                <StreakStrip
                  played={history.playedDays(game.id, 'daily')}
                  today={day}
                  protection={PROTECTION}
                  labels={{ run: streakLabel }}
                />
              </Card>
            ) : null}
            <Stack gap="sm">
              <Button
                variant="highlight"
                size="lg"
                block
                onPress={share}
                testID="round-share"
              >
                {progress.milestones.length
                  ? 'Share your streak'
                  : 'Share your result'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                block
                onPress={() => router.back()}
                testID="round-done"
              >
                Done
              </Button>
            </Stack>
          </RoundSummary>
        </Screen>
      );
    }
    return (
      <Screen scroll>
        <Stack gap="lg" flex={1} justify="center">
          <Text variant="display">
            {total ? 'Round done' : 'Nothing to play yet'}
          </Text>
          {total ? (
            <Text variant="lead" tone="muted">
              You had {summary.points} of {total}.{' '}
              {summary.perfect
                ? 'Every one.'
                : 'The ones you did not get come back first next time.'}
            </Text>
          ) : null}
          {daily && total ? (
            <Card>
              <StreakStrip
                played={history.playedDays(game.id, 'daily')}
                today={day}
                labels={{ run: streakLabel }}
              />
            </Card>
          ) : null}
          <Button
            variant="highlight"
            size="lg"
            block
            onPress={() => router.back()}
            testID="round-done"
          >
            Done
          </Button>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text variant="caption" tone="muted" tabular>
          {daily
            ? "Today's question"
            : `Question ${session.index + 1} of ${session.items.length}`}
        </Text>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          Close
        </Button>
      </View>

      <Stack gap="sm">
        <Badge tone="primary">{card.chapter}</Badge>
        {card.verified ? null : (
          <Badge tone="warning">Still being checked</Badge>
        )}
      </Stack>

      <Card tone="muted">
        <Text variant="caption" tone="muted">
          {card.heard?.who ? `${card.heard.who} says` : 'Someone says'}
        </Text>
        <Text variant="lead">
          {card.heard ? `“${card.heard.quote}”` : card.claim}
        </Text>
      </Card>

      <Reveal
        // A fresh reveal for each card, so its entrance plays again.
        key={card.id}
        revealed={session.phase === 'revealed'}
        onReveal={reveal}
        label="Show the answer"
        announce="The answer is shown."
        hidden={
          <Stack gap="lg">
            <Text variant="title">{card.claim}</Text>
            <Stack gap="md">
              {card.lines.map((l, i) => (
                <Text key={i} variant="body">
                  {l.says}
                </Text>
              ))}
            </Stack>
            {sources.length ? (
              <Text variant="caption" tone="muted">
                Sources: {sources.join(', ')}
              </Text>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push(`/answers/${card.id}`)}
            >
              The full answer and every quote
            </Button>
            <Stack direction="row" gap="sm">
              <Button
                variant="highlight"
                size="lg"
                style={{ flex: 1 }}
                onPress={() => rate('had-it')}
                testID="rate-had-it"
              >
                I had it
              </Button>
              <Button
                variant="outline"
                size="lg"
                style={{ flex: 1 }}
                onPress={() => rate('not-yet')}
                testID="rate-not-yet"
              >
                Not yet
              </Button>
            </Stack>
          </Stack>
        }
      >
        <Text variant="title">What would you say?</Text>
      </Reveal>
    </Screen>
  );
}
