// A date label that cannot throw. `Intl.DateTimeFormat#format` raises a RangeError on an invalid
// date, which would take down a whole list; an update with a bad date shows without one instead.
export function dateLabel(
  format: Pick<Intl.DateTimeFormat, 'format'>,
  date: Date,
): string | null {
  if (Number.isNaN(date.getTime())) return null;
  try {
    return format.format(date);
  } catch {
    return null;
  }
}
