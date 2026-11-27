// What a stretch of play changed, for the moment a round ends: XP and level, today's goal, the
// streak and its shields, any milestone passed, and the one line worth saying about it. Both the
// app and the site read it, so a finished round says the same thing on a phone and a page.
//
// `before` is the log as it was (at the start of a round, or before today); `after` is the log
// now. Everything is read from the logs, nothing is stored.
import { historyOf, type GameEvent } from '../engine/events.ts';
import type { DayKey } from '../interlace/daily.ts';
import {
  gainXp,
  milestonesCrossed,
  totalXp,
  xpOn,
  type Level,
} from '../interlace/progress-model.ts';
import {
  summarizeStreak,
  type StreakSummary,
} from '../interlace/streak-model.ts';
import { WWYS } from '../store/player.ts';
import {
  goalXp,
  PROTECTION,
  STREAK_MILESTONES,
  xpEntries,
  type GoalId,
} from './progress.ts';

export type RoundProgress = {
  xp: { total: number; gained: number; level: Level; levelsUp: number };
  goal: {
    xp: number;
    earned: number;
    earnedBefore: number;
    met: boolean;
    // Met by this stretch of play, not before it.
    metNow: boolean;
  };
  streak: StreakSummary & {
    // This stretch played today's daily for the first time.
    extended: boolean;
    shieldEarned: boolean;
  };
  // Streak milestones passed, smallest first.
  milestones: number[];
  // One sentence for the summary, or undefined when nothing is new.
  highlight: string | undefined;
};

const MILESTONE_WORDS: Record<number, string> = {
  3: 'A habit is starting.',
  7: 'A whole week of replies.',
  14: 'Two weeks in a row.',
  30: 'A month of replies.',
  50: 'Fifty days.',
  100: 'A hundred days.',
  200: 'Two hundred days.',
  365: 'A full year.',
};

/** The few words a milestone earns: "A whole week of replies." */
export function milestoneWords(days: number): string {
  return MILESTONE_WORDS[days] ?? 'Well kept.';
}

export function milestoneLine(days: number): string {
  return `${days}-day streak. ${milestoneWords(days)}`;
}

export function progressBetween(
  before: readonly GameEvent[],
  after: readonly GameEvent[],
  day: DayKey,
  goal: GoalId | undefined,
): RoundProgress {
  const was = xpEntries(before);
  const now = xpEntries(after);
  const gain = gainXp(totalXp(was), totalXp(now) - totalXp(was));

  const target = goalXp(goal);
  const earned = xpOn(now, day);
  const earnedBefore = xpOn(was, day);

  const daysWas = historyOf(before).playedDays(WWYS, 'daily');
  const daysNow = historyOf(after).playedDays(WWYS, 'daily');
  const s0 = summarizeStreak(daysWas, day, undefined, PROTECTION);
  const s1 = summarizeStreak(daysNow, day, undefined, PROTECTION);
  const extended = !daysWas.includes(day) && daysNow.includes(day);
  const milestones = extended
    ? milestonesCrossed(s0.current, s1.current, STREAK_MILESTONES)
    : [];
  const shieldEarned =
    s1.shields > s0.shields && s1.shieldsUsed === s0.shieldsUsed;
  const metNow = earnedBefore < target && earned >= target;

  const top = milestones.at(-1);
  const highlight =
    top !== undefined
      ? milestoneLine(top)
      : gain.levelsUp > 0
        ? `You reached level ${gain.after.level}.`
        : shieldEarned
          ? 'You earned a streak shield. It covers one day you miss.'
          : metNow
            ? 'Daily goal met.'
            : undefined;

  return {
    xp: {
      total: gain.after.total,
      gained: gain.gained,
      level: gain.after,
      levelsUp: gain.levelsUp,
    },
    goal: {
      xp: target,
      earned,
      earnedBefore,
      met: earned >= target,
      metNow,
    },
    streak: { ...s1, extended, shieldEarned },
    milestones,
    highlight,
  };
}
