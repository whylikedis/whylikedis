// One answer in full: the claim, what is heard, the answer line by line with the quotes behind it,
// and what is still argued. Every quote opens its source.
import {
  router,
  Stack as RouterStack,
  useLocalSearchParams,
} from 'expo-router';
import { Linking, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  PressableScale,
  Screen,
  Stack,
  Text,
  useTheme,
} from '../../interlace/native';
import { reportError } from '../../lib/errors/report';
import { openSource } from '../../lib/links';
import { cardById } from '../../lib/pack';
import { firstParam } from '../../lib/route-params';

export default function Answer() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const theme = useTheme();
  const id = firstParam(params.id);
  const card = id ? cardById(id) : undefined;
  if (!card) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Stack gap="lg" flex={1} justify="center">
          <Text variant="title">That answer is not in the app.</Text>
          <Text variant="body" tone="muted">
            The link may be from a newer version. Every answer we have is listed
            under Answers.
          </Text>
          {/* A link opened from outside has no screen behind it, so there is always a way on. */}
          <Button
            variant="highlight"
            size="lg"
            block
            onPress={() => router.replace('/answers')}
          >
            See all answers
          </Button>
        </Stack>
      </Screen>
    );
  }
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <RouterStack.Screen options={{ title: card.chapter }} />
      <Stack gap="xs">
        <Text variant="caption" tone="primary">
          Your kid heard
        </Text>
        <Text variant="heading">{card.claim}</Text>
      </Stack>
      <Stack direction="row" gap="xs" wrap>
        <Badge tone={card.verified ? 'success' : 'warning'}>
          {card.verified ? 'Checked by a second reader' : 'Still being checked'}
        </Badge>
        <Badge>{`${card.facts} facts`}</Badge>
        <Badge>{`${card.quotes} sources quoted`}</Badge>
        {card.approved ? null : <Badge>Not yet approved for teaching</Badge>}
      </Stack>

      {card.heard ? (
        <Card tone="muted">
          <Text variant="caption" tone="muted">
            {card.heard.who ?? 'What is said'}
          </Text>
          <Text variant="body">“{card.heard.quote}”</Text>
        </Card>
      ) : null}

      <Stack gap="lg">
        {card.lines.map((line, i) => (
          <Stack key={i} gap="sm">
            <Text variant="lead">{line.says}</Text>
            {line.sources.map((s, j) => (
              <PressableScale
                key={j}
                accessibilityRole="link"
                accessibilityLabel={`Source: ${s.publisher}. “${s.quote}”`}
                accessibilityHint="Opens the source in your browser"
                onPress={() => {
                  void openSource(s.url, Linking.openURL, reportError);
                }}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  paddingLeft: theme.space.md,
                  paddingVertical: theme.space['2xs'],
                  gap: 2,
                }}
              >
                {/* The whole quote: cutting it short would hide the words the source is cited for. */}
                <Text variant="caption" tone="muted">
                  “{s.quote}”
                </Text>
                <Text variant="caption" tone="primary">
                  {s.publisher}
                </Text>
              </PressableScale>
            ))}
          </Stack>
        ))}
      </Stack>

      {card.contested.length ? (
        <Card tone="muted">
          <Text variant="label">Still argued</Text>
          {card.contested.map((t, i) => (
            <Text key={i} variant="body" tone="muted">
              {t}
            </Text>
          ))}
        </Card>
      ) : null}
      <View style={{ height: theme.space.xl }} />
    </Screen>
  );
}
