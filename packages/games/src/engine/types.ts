// The contract every game in the app keeps. A game is a pure description: which modes it has,
// how it deals a round, and how it scores an answer. It never touches storage, the clock or the
// screen, so the same rules run in tests, on a phone, on the web, and on a server that checks a
// score later. The engine (session.ts) runs a round; the log (events.ts) remembers it.
import type { DayKey } from '../interlace/daily.ts';

export type GameId = string;

// One way to play a game: today's shared puzzle, a practice round, later a room with friends.
export type Mode = {
  id: string;
  // A daily mode deals the same round to every player on a day and counts toward the streak.
  daily: boolean;
};

// What a player earned for one answer. A self-rated game scores 1 of 1 or 0 of 1; a game like
// Closer scores by distance. `max` keeps different games comparable.
export type Score = { points: number; max: number };

// What the engine knows about a player's past, read from the event log. Games use it to deal a
// round (practice brings back what was missed), never to store anything.
export interface History {
  // The latest score for an item in a game, or undefined if it was never answered.
  lastScore(game: GameId, item: string): Score | undefined;
  // Days on which a round of this mode was finished, sorted, without repeats.
  playedDays(game: GameId, mode: string): DayKey[];
}

export type RoundContext<Content> = {
  content: Content;
  history: History;
  day: DayKey;
  mode: Mode;
};

export interface Game<Item extends { id: string }, Answer, Content> {
  id: GameId;
  modes: readonly Mode[];
  // The items of one round, dealt when the round starts and fixed until it ends. Must be
  // deterministic for a daily mode: the same content and day give the same round everywhere.
  deal(ctx: RoundContext<Content>): Item[];
  // The score for one answer. Pure, so a server can check it the same way.
  judge(item: Item, answer: Answer): Score;
}

export function modeOf<G extends { modes: readonly Mode[] }>(
  game: G,
  id: string,
): Mode | undefined {
  return game.modes.find((m) => m.id === id);
}
