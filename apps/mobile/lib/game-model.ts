// The rules of "What would you say?", the daily game: pure, so they are tested in Node and a server
// could score the same way later. Storage and screens are elsewhere.
import {
  dailyItem,
  dayKey,
  seededShuffle,
  type DayKey,
} from '../interlace/games/daily.ts';

export type Rating = 'had-it' | 'not-yet';

// What a player has done, as the app stores it on the device.
export type Progress = {
  version: 1;
  // Days with a finished daily game, for the streak.
  played: DayKey[];
  // The last rating for each card, so practice brings back the ones not yet known.
  ratings: Record<string, { rating: Rating; day: DayKey }>;
};

export const EMPTY: Progress = { version: 1, played: [], ratings: {} };

// The first day of the game, so every player's day 1 is the same puzzle.
export const FIRST_DAY: DayKey = '2026-11-25';

export const today = (now: Date | number = Date.now()) => dayKey(now);

// Today's card: the same for every player on the same day, never repeated within a cycle.
export function dailyCard<T extends { id: string }>(
  cards: readonly T[],
  day: DayKey,
): T | undefined {
  return dailyItem(cards, day, {
    order: 'shuffle',
    seed: 'what-would-you-say',
    firstDay: FIRST_DAY,
  });
}

// A practice round: the cards the player has not rated "had it" first, in a seeded order, then the
// rest, so a round is new each day but repeatable within it.
export function practiceRound<T extends { id: string }>(
  cards: readonly T[],
  progress: Progress,
  day: DayKey,
  size = 5,
): T[] {
  const shuffled = seededShuffle(cards, `practice:${day}`);
  const known = (c: T) => progress.ratings[c.id]?.rating === 'had-it';
  return [
    ...shuffled.filter((c) => !known(c)),
    ...shuffled.filter(known),
  ].slice(0, size);
}

// A finished daily game marks the day played; any rating updates that card.
export function record(
  progress: Progress,
  cardId: string,
  rating: Rating,
  day: DayKey,
  daily: boolean,
): Progress {
  return {
    version: 1,
    played:
      daily && !progress.played.includes(day)
        ? [...progress.played, day].sort()
        : progress.played,
    ratings: { ...progress.ratings, [cardId]: { rating, day } },
  };
}

// Whatever storage gives back, a Progress the app can trust: a corrupt or old value starts fresh.
export function parseProgress(raw: string | null): Progress {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw);
    if (
      v?.version !== 1 ||
      !Array.isArray(v.played) ||
      typeof v.ratings !== 'object' ||
      v.ratings === null
    )
      return EMPTY;
    return {
      version: 1,
      played: v.played.filter((d: unknown) => typeof d === 'string'),
      ratings: v.ratings,
    };
  } catch {
    return EMPTY;
  }
}
