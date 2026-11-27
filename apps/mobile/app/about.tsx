// About this app: what version is running, what it carries, how fast it started, and any problems
// it has had. Everything here is read on the phone. "Share diagnostics" opens the system share
// sheet, so a player decides whether to send it and to whom; it holds counts and timings, never
// answers or ratings.
import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Share } from 'react-native';
import { Button, Card, Screen, Stack, Text } from '../interlace/native';
import { ANALYTICS_NOTICE, ANALYTICS_ON } from '../lib/analytics';
import { recentErrors } from '../lib/errors/report';
import { cards, pack, updates } from '../lib/pack';
import { startupMarks } from '../lib/perf';
import { usePlayer } from '../lib/player';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justify="space-between" gap="md">
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="body" tabular>
        {value}
      </Text>
    </Stack>
  );
}

const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function About() {
  const { eventCount, synced } = usePlayer();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const marks = startupMarks();
  const errors = useMemo(() => recentErrors().slice().reverse(), []);

  const share = () =>
    Share.share({
      message: [
        `WhyLikeDIs app ${version}`,
        `Answers: ${cards.length}${pack.preview ? ' (preview)' : ''}, updates: ${updates.length}`,
        `Saved events: ${eventCount}, synced: ${synced ? 'yes' : 'no'}`,
        ...marks.map(([m, ms]) => `Startup, ${m}: ${ms} ms`),
        `Problems: ${errors.length}`,
        ...errors
          .slice(0, 10)
          .map(
            (e) =>
              `- ${new Date(e.at).toISOString()} [${e.where}] ${e.message}`,
          ),
      ].join('\n'),
    }).catch(() => {});

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Card>
        <Text variant="label">This app</Text>
        <Row label="Version" value={version} />
        <Row label="Answers in the app" value={String(cards.length)} />
        <Row label="Updates" value={String(updates.length)} />
        <Row
          label="Your progress"
          value={synced ? 'Synced' : 'On this phone only'}
        />
        {ANALYTICS_ON ? (
          <Text variant="caption" tone="muted">
            {ANALYTICS_NOTICE}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text variant="label">Startup</Text>
        {marks.length ? (
          marks.map(([m, ms]) => (
            <Row
              key={m}
              label={m[0].toUpperCase() + m.slice(1)}
              value={`${ms} ms`}
            />
          ))
        ) : (
          <Text variant="body" tone="muted">
            Not measured on this launch.
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="label">Problems</Text>
        {errors.length ? (
          errors.slice(0, 10).map((e, i) => (
            <Stack key={i} gap="3xs">
              <Text variant="caption" tone="muted">
                {when.format(e.at)} · {e.where}
                {e.fatal ? ' · closed the app' : ''}
              </Text>
              <Text variant="body" numberOfLines={3}>
                {e.message}
              </Text>
            </Stack>
          ))
        ) : (
          <Text variant="body" tone="muted">
            None recorded. Good.
          </Text>
        )}
      </Card>

      <Button variant="outline" block onPress={share}>
        Share diagnostics
      </Button>
      <Text variant="caption" tone="muted">
        Diagnostics hold the version, counts, startup times and recent problems.
        Nothing is sent unless you share it.
      </Text>
    </Screen>
  );
}
