import { Link } from 'expo-router';
import { Screen, Text } from '../interlace/native';

export default function NotFound() {
  return (
    <Screen>
      <Text variant="title">This page is not in the app.</Text>
      <Link href="/">
        <Text variant="label" tone="primary">
          Go to Play
        </Text>
      </Link>
    </Screen>
  );
}
