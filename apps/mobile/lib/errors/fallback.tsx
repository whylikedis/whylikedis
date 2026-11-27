// What a screen shows when it crashes, instead of a blank app. Expo Router renders a route's
// exported `ErrorBoundary` when that route throws, so one broken game never takes down the rest:
// the player can try again or go back to Play. The error is reported once, on mount.
import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Button, Screen, Stack, Text } from '../../interlace/native';
import { reportError } from './report';

export function ScreenError({
  error,
  retry,
  where,
}: ErrorBoundaryProps & { where: string }) {
  useEffect(() => {
    reportError(error, where);
  }, [error, where]);

  return (
    <Screen scroll>
      <Stack gap="lg" flex={1} justify="center">
        <Text variant="title">Something went wrong here</Text>
        <Text variant="body" tone="muted">
          Your progress is saved. Try again, or go back and pick another game.
        </Text>
        <Button variant="highlight" size="lg" block onPress={() => retry()}>
          Try again
        </Button>
        <Button
          variant="ghost"
          size="lg"
          block
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
        >
          Back to Play
        </Button>
      </Stack>
    </Screen>
  );
}
