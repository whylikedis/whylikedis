// Play: the home of the app. Today's game, the streak it keeps, and a practice round.
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Badge,
  Card,
  Screen,
  Stack,
  StreakStrip,
  Text,
} from '../../interlace/native';
import { dailyCard, today } from '../../lib/game-model';
import { cards } from '../../lib/pack';
import { useProgress } from '../../lib/progress';

export default function Play() {
  const { progress } = useProgress();
  const day = today();
  const daily = useMemo(() => dailyCard(cards, day), [day]);
  const doneToday = progress.played.includes(day);

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <Stack gap="2xs">
        <Text variant="caption" tone="primary">
          WhyLikeDIs
        </Text>
        <Text variant="display">Play</Text>
      </Stack>

      <Card>
        <StreakStrip
          played={progress.played}
          today={day}
          labels={{
            run: (n) =>
              n === 0
                ? 'Play today to start a streak'
                : n === 1
                  ? '1 day in a row'
                  : `${n} days in a row`,
          }}
        />
      </Card>

      {daily ? (
        <Card
          tone="highlight"
          padding="xl"
          onPress={() => router.push('/play/daily')}
          accessibilityLabel={
            doneToday
              ? "Today's question. Played. Play again"
              : "Today's question. Play"
          }
        >
          <Text variant="caption" tone="onHighlight">
            {doneToday
              ? 'Played today. Play it again any time.'
              : "Today's question"}
          </Text>
          <Text variant="title" tone="onHighlight">
            What would you say?
          </Text>
          <Text variant="body" tone="onHighlight">
            Someone says something about Israel. Think of your reply, then see
            the answer and its sources.
          </Text>
        </Card>
      ) : null}

      <Card
        onPress={() => router.push('/play/practice')}
        accessibilityLabel="Practice round, five questions"
      >
        <Text variant="title">Practice round</Text>
        <Text variant="body" tone="muted">
          Five questions. The ones you have not got yet come first.
        </Text>
      </Card>

      <Card tone="muted">
        <Badge tone="primary">Coming next</Badge>
        <Text variant="label">
          Closer, Before or after, and playing with friends
        </Text>
        <Text variant="caption" tone="muted">
          More games are on the way, for one player, two, or a whole room.
        </Text>
      </Card>
    </Screen>
  );
}
