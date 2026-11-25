// How WhyLikeDIs turns play into progress: what earns XP, the daily goals a player can pick, how
// shields protect a streak, and which streak lengths are milestones. The arithmetic (levels, goal
// progress, shields) is Interlace's (progress-model, streak-model); this file holds only our rules,
// read from the event log, so the app and the site give the same XP for the same play.
//
// XP rewards showing up and finishing, never the rating. "I had it" and "Not yet" earn the same, so
// an honest "Not yet" never costs a player anything.
import type { DayKey } from '../interlace/daily.ts';
import type { GameEvent } from '../engine/events.ts';

/** XP for one daily question, the first time it is answered that day. */
export const DAILY_XP = 10;
/** XP for each practice question. */
export const PRACTICE_XP = 5;
/** Extra XP for finishing a practice round of at least `ROUND_MIN_ITEMS` questions. */
export const ROUND_BONUS_XP = 5;
export const ROUND_MIN_ITEMS = 3;

export type XpEntry = { day: DayKey; xp: number };

/** The daily goals a player can pick. Today's question alone meets the first. */
export const GOALS = [
  { id: 'light', xp: 10, label: 'Light', detail: "Today's question" },
  {
    id: 'steady',
    xp: 20,
    label: 'Steady',
    detail: "Today's question and two more",
  },
  {
    id: 'keen',
    xp: 40,
    label: 'Keen',
    detail: "Today's question and a practice round",
  },
] as const;
export type GoalId = (typeof GOALS)[number]['id'];
export const DEFAULT_GOAL: GoalId = 'light';

export function goalXp(id: string | undefined): number {
  return (GOALS.find((g) => g.id === id) ?? GOALS[0]).xp;
}

export function isGoalId(v: unknown): v is GoalId {
  return GOALS.some((g) => g.id === v);
}

/** Every 7 days played earns a shield that covers one missed day; a player holds at most 2. */
export const PROTECTION = { every: 7, max: 2 } as const;

/** Streak lengths worth a moment, and a share. */
export const STREAK_MILESTONES: readonly number[] = [
  3, 7, 14, 30, 50, 100, 200, 365,
];

/**
 * The XP each event earned, by day. A daily question counts once per day however many times it is
 * replayed; practice counts every answer, since practice is the point.
 */
export function xpEntries(events: readonly GameEvent[]): XpEntry[] {
  const out: XpEntry[] = [];
  const dailySeen = new Set<string>();
  for (const e of events) {
    if (e.kind === 'answer') {
      if (e.mode === 'daily') {
        const key = `${e.game}\u0000${e.day}\u0000${e.item}`;
        if (dailySeen.has(key)) continue;
        dailySeen.add(key);
        out.push({ day: e.day, xp: DAILY_XP });
      } else {
        out.push({ day: e.day, xp: PRACTICE_XP });
      }
    } else if (e.mode !== 'daily' && e.items >= ROUND_MIN_ITEMS) {
      out.push({ day: e.day, xp: ROUND_BONUS_XP });
    }
  }
  return out;
}

/** The XP one event would add on top of a log, for the "+15 XP" a round shows. */
export function xpGained(
  before: readonly GameEvent[],
  after: readonly GameEvent[],
): number {
  const sum = (l: readonly GameEvent[]) =>
    xpEntries(l).reduce((s, e) => s + e.xp, 0);
  return Math.max(0, sum(after) - sum(before));
}
