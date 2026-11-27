// "What would you say?": someone makes a claim about Israel; the player thinks of a reply, sees the
// answer with its sources, and says honestly whether they had it. Daily (one shared card a day) and
// practice (five, the ones not yet known first).
import { dailyItem, seededShuffle, type DayKey } from '../interlace/daily.ts';
import type { Game, History } from '../engine/types.ts';
import { WWYS } from '../store/player.ts';

export type Rating = 'had-it' | 'not-yet';

// The first day of the game, so every player's day 1 is the same card.
export const FIRST_DAY: DayKey = '2026-11-25';
export const PRACTICE_SIZE = 5;

export function dailyCard<T extends { id: string }>(
  cards: readonly T[],
  day: DayKey,
): T | undefined {
  return dailyItem(cards, day, {
    order: 'shuffle',
    seed: WWYS,
    firstDay: FIRST_DAY,
  });
}

// The cards not yet rated "had it" first, in an order seeded by the day, then the rest: new each
// day, repeatable within it.
export function practiceRound<T extends { id: string }>(
  cards: readonly T[],
  history: History,
  day: DayKey,
  size = PRACTICE_SIZE,
): T[] {
  const shuffled = seededShuffle(cards, `practice:${day}`);
  const known = (c: T) => {
    const s = history.lastScore(WWYS, c.id);
    return !!s && s.points >= s.max;
  };
  return [
    ...shuffled.filter((c) => !known(c)),
    ...shuffled.filter(known),
  ].slice(0, size);
}

export function whatWouldYouSay<T extends { id: string }>(): Game<
  T,
  Rating,
  readonly T[]
> {
  return {
    id: WWYS,
    modes: [
      { id: 'daily', daily: true },
      { id: 'practice', daily: false },
    ],
    deal: ({ content, history, day, mode }) => {
      if (mode.daily) {
        const c = dailyCard(content, day);
        return c ? [c] : [];
      }
      return practiceRound(content, history, day);
    },
    judge: (_item, rating) => ({ points: rating === 'had-it' ? 1 : 0, max: 1 }),
  };
}
