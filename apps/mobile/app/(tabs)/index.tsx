// Play: the games section. Where the player stands (level, today's goal, the streak and its
// shields), today's game, a practice round, the goal and reminder settings, and the games on the
// way (from lib/games/catalog.ts). Progress is read from the log with @whylikedis/games' rules, so
// it matches the site.
import type { PackCard } from '@whylikedis/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { dayKey } from '../../interlace/games/daily';
import {
  Badge,
  Button,
  Card,
  ContrastToggle,
  GoalMeter,
  LevelMeter,
  Screen,
  Stack,
  StreakStrip,
  Text,
  TextSizeControl,
} from '../../interlace/native';
import { capture } from '../../lib/analytics';
import { comingSoon } from '../../lib/games/catalog';
import { listOf, streakLabel } from '../../lib/games/labels';
import {
  dailyCard,
  GOALS,
  PROTECTION,
  progressBetween,
  WWYS,
  type GoalId,
} from '@whylikedis/games';
import { cards } from '../../lib/pack';
import { usePlayer } from '../../lib/player';
import { useReading } from '../../lib/reading/context';
import { REMINDERS_AVAILABLE, useReminder } from '../../lib/progress/reminder';
import {
  REMINDER_TIMES,
  reminderLabel,
} from '../../lib/progress/reminder-times';

export default function Play() {
  const { history, events, goal, setGoal } = usePlayer();
  const day = dayKey();
  const daily = useMemo(() => dailyCard<PackCard>(cards, day), [day]);
  const played = history.playedDays(WWYS, 'daily');
  const doneToday = played.includes(day);
  const coming = comingSoon();
  const progress = useMemo(
    () =>
      progressBetween(
        events.filter((e) => e.day < day),
        events,
        day,
        goal,
      ),
    [events, day, goal],
  );
  const reminder = useReminder();
  const reading = useReading();

  const pickGoal = (id: GoalId) => {
    if (id === (goal ?? 'light')) return;
    capture('goal_changed', { goal: id, from: goal ?? 'light' });
    setGoal(id);
  };

  const pickTime = async (hour: number, minute: number) => {
    const ok = await reminder.set({ on: true, hour, minute });
    if (ok) capture('reminder_set', { hour });
  };

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <Stack gap="2xs">
        <Text variant="caption" tone="primary">
          WhyLikeDIs
        </Text>
        <Text variant="display">Play</Text>
      </Stack>

      <Card>
        <Stack gap="lg">
          <LevelMeter xp={progress.xp.total} />
          <GoalMeter earned={progress.goal.earned} goal={progress.goal.xp} />
          <StreakStrip
            played={played}
            today={day}
            protection={PROTECTION}
            labels={{ run: streakLabel }}
          />
        </Stack>
      </Card>

      {daily ? (
        <Card
          tone="highlight"
          padding="xl"
          onPress={() => router.push(`/play/${WWYS}/daily`)}
          testID="play-daily"
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
        onPress={() => router.push(`/play/${WWYS}/practice`)}
        testID="play-practice"
        accessibilityLabel="Practice round, five questions"
      >
        <Text variant="title">Practice round</Text>
        <Text variant="body" tone="muted">
          Five questions. The ones you have not got yet come first.
        </Text>
      </Card>

      <Card>
        <Text variant="label">Your daily goal</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {GOALS.map((g) => {
            const on = (goal ?? 'light') === g.id;
            return (
              <Button
                key={g.id}
                variant={on ? 'highlight' : 'outline'}
                block
                onPress={() => pickGoal(g.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                testID={`goal-${g.id}`}
              >
                {`${g.label}, ${g.xp} XP: ${g.detail.toLowerCase()}`}
              </Button>
            );
          })}
        </View>
      </Card>

      {REMINDERS_AVAILABLE ? (
        <Card>
          <Text variant="label">Daily reminder</Text>
          <Text variant="body" tone="muted">
            {reminder.pref.on
              ? `A nudge every day at ${reminderLabel(reminder.pref)}. It stays on this phone.`
              : 'A quiet nudge once a day, at a time you pick. It stays on this phone.'}
          </Text>
          {reminder.denied ? (
            <Text variant="caption" tone="warning">
              Notifications are off for this app. Turn them on in Settings to
              get the reminder.
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REMINDER_TIMES.map((t) => {
              const on =
                reminder.pref.on &&
                reminder.pref.hour === t.hour &&
                reminder.pref.minute === t.minute;
              return (
                <Button
                  key={t.id}
                  size="sm"
                  variant={on ? 'highlight' : 'outline'}
                  onPress={() => pickTime(t.hour, t.minute)}
                  accessibilityState={{ selected: on }}
                  testID={`reminder-${t.id}`}
                >
                  {t.label}
                </Button>
              );
            })}
            {reminder.pref.on ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  void reminder.set({ ...reminder.pref, on: false });
                  capture('reminder_off', {});
                }}
                testID="reminder-off"
              >
                Turn off
              </Button>
            ) : null}
          </View>
        </Card>
      ) : null}

      <Card>
        <Text variant="label">Reading</Text>
        <Text variant="body" tone="muted">
          Make the text bigger, or turn on more contrast. It stays on this
          phone, and it adds to your phone's own text size.
        </Text>
        <TextSizeControl
          value={reading.prefs.textSize}
          onChange={reading.setTextSize}
        />
        <ContrastToggle
          value={reading.prefs.contrast}
          onChange={reading.setContrast}
        />
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

      <Button
        variant="ghost"
        size="sm"
        onPress={() => router.push('/about')}
        testID="about"
      >
        About this app
      </Button>
    </Screen>
  );
}
