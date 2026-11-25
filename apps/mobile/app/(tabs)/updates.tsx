// Updates: what is new at WhyLikeDIs, newest first. Only our own work, and only finished work: an
// answer appears here once a second reader has checked it. Later, data releases and sessions join
// the same feed through the same PackUpdate shape.
import { FlashList } from '@shopify/flash-list';
import type { PackUpdate } from '@whylikedis/content';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayKeyToDate } from '../../interlace/games/daily';
import { ListRow, Text, useTheme } from '../../interlace/native';
import { updates } from '../../lib/pack';

const dateLabel = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function Updates() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: PackUpdate }) => (
      <ListRow
        overline={`New answer · ${dateLabel.format(dayKeyToDate(item.date))}`}
        // In quotes: it is the claim people hear, which the answer checks, not our statement.
        title={`“${item.title}”`}
        subtitle={`What the sources say · ${item.chapter}`}
        accessibilityRole="link"
        onPress={() => router.push(`/answers/${item.target.id}`)}
      />
    ),
    [],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={{ padding: theme.space.lg, gap: theme.space.xs }}>
        <Text variant="display">Updates</Text>
        <Text variant="body" tone="muted">
          New answers, once a second reader has checked them.
        </Text>
      </View>
      <FlashList
        data={updates}
        keyExtractor={(u) => u.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.space['2xl'],
        }}
        ListEmptyComponent={
          <Text variant="body" tone="muted" style={{ padding: theme.space.lg }}>
            Nothing new yet.
          </Text>
        }
      />
    </View>
  );
}
