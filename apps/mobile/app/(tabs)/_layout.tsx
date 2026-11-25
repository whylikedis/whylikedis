// Two tabs on the platform's own tab bar (UITabBarController on iOS, Material on Android): play is
// home, answers is the library the games draw from.
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../interlace/native';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.colors.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }}
          md="sports_esports"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="answers">
        <NativeTabs.Trigger.Label>Answers</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book', selected: 'book.fill' }}
          md="menu_book"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
