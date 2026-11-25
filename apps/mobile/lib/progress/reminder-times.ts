// The daily reminder's choices and its saved form. Pure, so it is tested in Node; the scheduling
// itself is ./reminder.ts.

export type ReminderPref = { on: boolean; hour: number; minute: number };

export const REMINDER_KEY = 'wld.reminder';

export const REMINDER_TIMES = [
  { id: 'morning', hour: 8, minute: 0, label: 'Morning, 8:00' },
  { id: 'lunch', hour: 12, minute: 30, label: 'Lunch, 12:30' },
  { id: 'evening', hour: 18, minute: 30, label: 'Evening, 6:30' },
  { id: 'night', hour: 21, minute: 0, label: 'Night, 9:00' },
] as const;

export const REMINDER_OFF: ReminderPref = { on: false, hour: 18, minute: 30 };

// A stored value, or off when it is missing or unreadable.
export function readReminder(raw: string | null): ReminderPref {
  if (!raw) return REMINDER_OFF;
  try {
    const v = JSON.parse(raw);
    const ok =
      typeof v?.on === 'boolean' &&
      Number.isInteger(v.hour) &&
      v.hour >= 0 &&
      v.hour < 24 &&
      Number.isInteger(v.minute) &&
      v.minute >= 0 &&
      v.minute < 60;
    return ok ? { on: v.on, hour: v.hour, minute: v.minute } : REMINDER_OFF;
  } catch {
    return REMINDER_OFF;
  }
}

// "6:30 PM" in the phone's locale.
export function reminderLabel(p: ReminderPref, locale?: string): string {
  const d = new Date(Date.UTC(2026, 0, 1, p.hour, p.minute));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}
