// Answers: every answer the app has, searchable, in a recycled list so it stays smooth at any length.
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListRow, Text, useTheme } from '../../interlace/native';
import type { PackCard } from '@whylikedis/content';
import { cards } from '../../lib/pack';

const norm = (s: string) => s.toLowerCase().normalize('NFKD');

export default function Answers() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const shown = useMemo(() => {
    const q = norm(deferred.trim());
    return q
      ? cards.filter((c) => norm(`${c.claim} ${c.chapter}`).includes(q))
      : cards;
  }, [deferred]);

  const renderItem = useCallback(
    ({ item }: { item: PackCard }) => (
      <ListRow
        overline={item.chapter}
        title={item.claim}
        subtitle={`${item.verified ? 'Checked by a second reader' : 'Still being checked'} · ${item.quotes} sources quoted`}
        accessibilityRole="link"
        onPress={() => router.push(`/answers/${item.id}`)}
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
      <View style={{ padding: theme.space.lg, gap: theme.space.md }}>
        <Text variant="display">Answers</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search what you heard"
          placeholderTextColor={theme.colors.mutedForeground}
          accessibilityLabel="Search the answers"
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{
            minHeight: theme.control.md,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.input,
            backgroundColor: theme.colors.card,
            color: theme.colors.foreground,
            paddingHorizontal: theme.space.md,
            fontSize: theme.type.body.fontSize,
          }}
        />
      </View>
      <FlashList
        data={shown}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.space['2xl'],
        }}
        ListEmptyComponent={
          <Text variant="body" tone="muted" style={{ padding: theme.space.lg }}>
            No answer matches that yet.
          </Text>
        }
      />
    </View>
  );
}
