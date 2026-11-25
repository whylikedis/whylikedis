// The daily reminder: one local notification at the time the player picked, scheduled on the
// phone by the system. Nothing goes through a server and no push service is used, so it costs
// nothing and works offline. Turning it off cancels it. Permission is asked only when the player
// turns it on.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { reportError } from '../errors/report';
import {
  readReminder,
  REMINDER_KEY,
  REMINDER_OFF,
  type ReminderPref,
} from './reminder-times';

const ID = 'daily-question';

// Local notifications exist on phones only; the web preview shows no reminder settings.
export const REMINDERS_AVAILABLE = Platform.OS !== 'web';

if (REMINDERS_AVAILABLE)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

async function schedule(p: ReminderPref): Promise<boolean> {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  if (!p.on) return true;
  const perm = await Notifications.getPermissionsAsync();
  const granted = perm.granted
    ? true
    : (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: {
      title: "Today's question is ready",
      body: 'What would you say? Two minutes, with the sources.',
      data: { url: '/play/what-would-you-say/daily' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: p.hour,
      minute: p.minute,
    },
  });
  return true;
}

export type ReminderState = {
  pref: ReminderPref;
  // The player said no to notifications in the system prompt.
  denied: boolean;
  set: (p: ReminderPref) => Promise<boolean>;
};

export function useReminder(): ReminderState {
  const [pref, setPref] = useState<ReminderPref>(REMINDER_OFF);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(REMINDER_KEY)
      .then((raw) => setPref(readReminder(raw)))
      .catch(() => {});
  }, []);
  const set = useCallback(async (p: ReminderPref) => {
    try {
      const ok = await schedule(p);
      const saved = ok ? p : { ...p, on: false };
      setDenied(!ok);
      setPref(saved);
      await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(saved));
      return ok;
    } catch (e) {
      reportError(e, 'reminder');
      return false;
    }
  }, []);
  return { pref, denied, set };
}

// A tap on the reminder opens today's question, whether the app was running or not.
export function useReminderTap(ready: boolean) {
  useEffect(() => {
    if (!ready || !REMINDERS_AVAILABLE) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/play/'))
        router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
