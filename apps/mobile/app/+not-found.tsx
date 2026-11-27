import { router } from 'expo-router';
import { Button, Screen, Stack, Text } from '../interlace/native';

export default function NotFound() {
  return (
    <Screen>
      <Stack gap="lg" flex={1} justify="center">
        <Text variant="title">This page is not in the app.</Text>
        <Button
          variant="highlight"
          size="lg"
          block
          onPress={() => router.replace('/')}
        >
          Go to Play
        </Button>
      </Stack>
    </Screen>
  );
}
