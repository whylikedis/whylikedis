// Play: the games section. Today's game, the streak it keeps, a practice round, and the games on
// the way (from lib/games/catalog.ts).
import type { PackCard } from '@whylikedis/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { dayKey } from '../../interlace/games/daily';
import { Badge, Card, Screen, Stack, StreakStrip, Text } from '../../interlace/native';
import { comingSoon } from '../../lib/games/catalog';
import { listOf, streakLabel } from '../../lib/games/labels';
import { dailyCard } from '../../lib/games/what-would-you-say';
import { cards } from '../../lib/pack';
import { usePlayer } from '../../lib/player';
import { WWYS } from '../../lib/store/player';

export default function Play() {
  const { history } = usePlayer();
  const day = dayKey();
  const daily = useMemo(() => dailyCard<PackCard>(cards, day), [day]);
  const played = history.playedDays(WWYS, 'daily');
  const doneToday = played.includes(day);
  const coming = comingSoon();

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
          played={played}
          today={day}
          labels={{ run: streakLabel }}
        />
      </Card>

      {daily ? (
        <Card
          tone="highlight"
          padding="xl"
          onPress={() => router.push(`/play/${WWYS}/daily`)}
          testID="play-daily"
          accessibilityLabel={
            doneToday ? "Today's question. Played. Play again" : "Today's question. Play"
          }
        >
          <Text variant="caption" tone="onHighlight">
            {doneToday ? 'Played today. Play it again any time.' : "Today's question"}
          </Text>
          <Text variant="title" tone="onHighlight">
            What would you say?
          </Text>
          <Text variant="body" tone="onHighlight">
            Someone says something about Israel. Think of your reply, then see the answer and
            its sources.
          </Text>
        </Card>
      ) : null}

      <Card
        onPress={() => router.push(`/play/${WWYS}/practice`)}
        testID="play-practice"
        accessibilityLabel="Practice round, five questions"
      >
        <Text variant="title">Practice round</Text>
        <Text variant="body" tone="muted">
          Five questions. The ones you have not got yet come first.
        </Text>
      </Card>

      {coming.length ? (
        <Card tone="muted">
          <Badge tone="primary">Coming next</Badge>
          <Text variant="label">{listOf(coming.map((g) => g.title))}</Text>
          <Text variant="caption" tone="muted">
            More games are on the way, for one player, two, or a whole room.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
