// The tab bar, on the platform's own control (UITabBarController on iOS, Material on Android),
// built from the section list in lib/shell/sections.ts. A switched-off section keeps its route but
// shows no tab.
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../interlace/native';
import { usePlayer } from '../../lib/player';
import { updates } from '../../lib/pack';
import { SECTIONS, type SectionId } from '../../lib/shell/sections';
import { badgeText, unreadCount } from '../../lib/shell/unread';

export default function TabsLayout() {
  const theme = useTheme();
  const { seenUpdates } = usePlayer();
  const badges: Partial<Record<SectionId, string>> = {
    updates: badgeText(unreadCount(updates, seenUpdates)),
  };
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
          {badges[s.id] ? (
            <NativeTabs.Trigger.Badge>{badges[s.id]}</NativeTabs.Trigger.Badge>
          ) : null}
          <NativeTabs.Trigger.Icon
            sf={{ default: s.icon.sf, selected: s.icon.sfSelected }}
            md={s.icon.md}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
