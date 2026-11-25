// The tab bar, on the platform's own control (UITabBarController on iOS, Material on Android),
// built from the section list in lib/shell/sections.ts. A switched-off section keeps its route but
// shows no tab.
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../interlace/native';
import { SECTIONS } from '../../lib/shell/sections';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.colors.primary}>
      {SECTIONS.map((s) => (
        <NativeTabs.Trigger
          key={s.id}
          name={s.route}
          hidden={!s.enabled}
          testID={`tab-${s.id}`}
        >
          <NativeTabs.Trigger.Label>{s.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: s.icon.sf, selected: s.icon.sfSelected }}
            md={s.icon.md}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
