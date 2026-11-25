// The app's frame: gestures, safe areas, the theme and the player's progress, then the screens.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InterlaceProvider, useTheme } from '../interlace/native';
import { ProgressProvider } from '../lib/progress';
import { brand } from '../lib/theme';

function Screens() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: theme.colors.primary,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.foreground },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="play/[mode]"
          options={{
            title: '',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen name="answers/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <InterlaceProvider scheme="system" overrides={brand}>
          <ProgressProvider>
            <Screens />
          </ProgressProvider>
        </InterlaceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
