// A round of "What would you say?": one card for the daily game, five for practice. For each, the
// claim someone makes, a moment to think, the answer with its sources, and an honest "I had it" or
// "Not yet". The rules are in lib/games/what-would-you-say.ts and the flow in the engine; this
// screen only draws them.
import type { PackCard } from '@whylikedis/content';
import * as Haptics from 'expo-haptics';
import {
  router,
  useLocalSearchParams,
  type ErrorBoundaryProps,
} from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Reveal,
  Screen,
  Stack,
  StreakStrip,
  Text,
} from '../../../interlace/native';
import { ScreenError } from '../../../lib/errors/fallback';
import { whatWouldYouSay, type Rating } from '@whylikedis/games';
import { streakLabel } from '../../../lib/games/labels';
import { cards, shortName } from '../../../lib/pack';
import { usePlayer } from '../../../lib/player';
import { useGameSession } from '../../../lib/use-game-session';

const game = whatWouldYouSay<PackCard>();

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ScreenError {...props} where="play/what-would-you-say" />;
}

export default function Round() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { history } = usePlayer();
  const {
    session,
    item: card,
    summary,
    day,
    reveal,
    answer,
  } = useGameSession(game, mode === 'practice' ? 'practice' : 'daily', cards);
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

  if (!card) {
    const total = session.items.length;
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
