// A game round: "What would you say?" One card for the daily game, five for practice. For each,
// the claim someone makes, a moment to think, the answer with its sources, and an honest "I had it"
// or "Not yet" from the player.
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
} from '../../interlace/native';
import {
  dailyCard,
  practiceRound,
  today,
  type Rating,
} from '../../lib/game-model';
import { cards, shortName } from '../../lib/pack';
import { useProgress } from '../../lib/progress';

export default function Round() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const daily = mode !== 'practice';
  const { progress, rate } = useProgress();
  const day = today();
  // The round is fixed when it starts, so a rating mid-round does not reshuffle it.
  const [round] = useState(() => {
    if (daily) {
      const c = dailyCard(cards, day);
      return c ? [c] : [];
    }
    return practiceRound(cards, progress, day);
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [had, setHad] = useState(0);
  const card = round[index];

  const answer = useCallback(
    (rating: Rating) => {
      if (!card) return;
      rate(card.id, rating, daily);
      if (rating === 'had-it') setHad((n) => n + 1);
      Haptics.notificationAsync(
        rating === 'had-it'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    [card, rate, daily],
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
    return (
      <Screen scroll>
        <Stack gap="lg" flex={1} justify="center">
          <Text variant="display">
            {round.length ? 'Round done' : 'Nothing to play yet'}
          </Text>
          {round.length ? (
            <Text variant="lead" tone="muted">
              You had {had} of {round.length}.{' '}
              {had === round.length
                ? 'Every one.'
                : 'The ones you did not get come back first next time.'}
            </Text>
          ) : null}
          {daily && round.length ? (
            <Card>
              <StreakStrip
                played={progress.played}
                today={day}
                labels={{ run: (n) => `${n} days in a row` }}
              />
            </Card>
          ) : null}
          <Button
            variant="highlight"
            size="lg"
            block
            onPress={() => router.back()}
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
            : `Question ${index + 1} of ${round.length}`}
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
        revealed={revealed}
        onReveal={() => setRevealed(true)}
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
                onPress={() => answer('had-it')}
              >
                I had it
              </Button>
              <Button
                variant="outline"
                size="lg"
                style={{ flex: 1 }}
                onPress={() => answer('not-yet')}
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
