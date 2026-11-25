// The app's frame: gestures, safe areas, the theme and the player's state, then the screens. The
// splash stays up until the player's state has loaded, so no screen ever draws an empty streak
// and then jumps. Uncaught errors are reported, and a crashing screen shows ScreenError.
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InterlaceProvider, useTheme } from '../interlace/native';
import { ScreenError } from '../lib/errors/fallback';
import { installGlobalHandler } from '../lib/errors/report';
import { PlayerProvider, usePlayer } from '../lib/player';
import { brand } from '../lib/theme';

installGlobalHandler();
SplashScreen.preventAutoHideAsync().catch(() => {});

// The last line of defence: it renders in place of this layout, outside its providers, so it
// brings the ones a screen needs.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <InterlaceProvider scheme="system" overrides={brand}>
        <ScreenError {...props} where="root" />
      </InterlaceProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const theme = useTheme();
  const { ready } = usePlayer();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
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
          name="play/what-would-you-say/[mode]"
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
          <PlayerProvider>
            <Screens />
          </PlayerProvider>
        </InterlaceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
