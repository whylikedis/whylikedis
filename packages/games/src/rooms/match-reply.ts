// "Match the reply", the live room game: the big screen shows a claim someone makes about Israel,
// and every phone picks which reply answers it, from the opening lines of our verified answers.
// Every word on screen is already-reviewed text from the content pack: the claim, and the answers'
// own sentences. Nothing is written for the game, so it makes no claim the gate has not checked.
//
// The host deals the rounds and scores them; phones only see a round's prompt, and its solution
// arrives with the reveal (room-model's `prompt` and `solution`).
import { seededShuffle } from '../interlace/daily.ts';

/** The parts of a content-pack card this game reads. */
export interface ReplyCard {
  id: string;
  claim: string;
  chapter?: string;
  verified?: boolean;
  lines: { says: string; sources: { publisher: string; url: string }[] }[];
}

export interface MatchChoice {
  /** The card the line comes from. */
  id: string;
  text: string;
}

/** What a phone and the big screen show while a round is open. Never the answer. */
export interface MatchPrompt {
  game: 'match-reply';
  round: number;
  rounds: number;
  claim: string;
  chapter?: string;
  choices: MatchChoice[];
  /** Seconds to answer, so every screen shows the same clock. */
  seconds: number;
}

/** What the reveal adds: the right choice, the whole answer and where it comes from. */
export interface MatchSolution {
  correct: string;
  lines: string[];
  sources: { publisher: string; url: string }[];
  /** The answer's page on the site, for "read the whole answer". */
  href: string;
}

export interface MatchRound {
  prompt: MatchPrompt;
  solution: MatchSolution;
}

export const MATCH_SECONDS = 20;
export const MATCH_MAX_CHOICES = 4;
/** Points for a right answer: half for being right, half for speed. */
export const MATCH_POINTS = 1000;

/** The first sentence of an answer: what a phone can show on a tile. */
export function openingLine(card: ReplyCard): string | null {
  const first = card.lines[0]?.says.trim();
  return first ? first : null;
}

/**
 * The game's rounds, the same for any host that deals with the same `seed` (the room code) from the
 * same cards. Only verified cards with an answer line, one card per claim; each round offers the
 * right card's opening line and up to three from cards about other claims. Fewer than two usable
 * cards: no game.
 */
export function dealMatchReply(
  cards: readonly ReplyCard[],
  seed: string,
  options: { rounds?: number; seconds?: number; choices?: number } = {},
): MatchRound[] {
  const seconds = options.seconds ?? MATCH_SECONDS;
  const maxChoices = Math.max(
    2,
    Math.min(options.choices ?? MATCH_MAX_CHOICES, MATCH_MAX_CHOICES),
  );
  const seen = new Set<string>();
  const usable = cards.filter((c) => {
    if (c.verified === false || !openingLine(c) || seen.has(c.claim))
      return false;
    seen.add(c.claim);
    return true;
  });
  if (usable.length < 2) return [];
  const order = seededShuffle(usable, `match:${seed}`);
  const rounds = Math.min(options.rounds ?? order.length, order.length);
  return order.slice(0, rounds).map((card, i) => {
    const others = seededShuffle(
      usable.filter((c) => c.id !== card.id),
      `match:${seed}:${i}`,
    ).slice(0, maxChoices - 1);
    const choices = seededShuffle(
      [card, ...others],
      `match:${seed}:${i}:choices`,
    ).map((c) => ({ id: c.id, text: openingLine(c)! }));
    const sources = new Map<string, { publisher: string; url: string }>();
    for (const l of card.lines)
      for (const s of l.sources)
        if (!sources.has(s.url))
          sources.set(s.url, { publisher: s.publisher, url: s.url });
    return {
      prompt: {
        game: 'match-reply',
        round: i + 1,
        rounds,
        claim: card.claim,
        chapter: card.chapter,
        choices,
        seconds,
      },
      solution: {
        correct: card.id,
        lines: card.lines.map((l) => l.says),
        sources: [...sources.values()],
        href: `/answers/${card.id}/`,
      },
    };
  });
}

/**
 * Points for one answer. Right: half the points for being right and the rest by how much time was
 * left, rounded to tens. Wrong or late: zero. Times are the host's clock.
 */
export function scoreMatch(
  answer: { value: unknown; at: number } | undefined,
  correct: string,
  window: { openedAt: number; endsAt: number },
): number {
  if (!answer || answer.value !== correct) return 0;
  const span = window.endsAt - window.openedAt;
  if (span <= 0) return MATCH_POINTS;
  if (answer.at > window.endsAt) return 0;
  const left = Math.min(1, Math.max(0, (window.endsAt - answer.at) / span));
  return Math.round((MATCH_POINTS / 2 + (MATCH_POINTS / 2) * left) / 10) * 10;
}

/** Every player's points for a round, for the host's `reveal`. */
export function scoreMatchRound(
  answers: Readonly<Record<string, { value: unknown; at: number }>>,
  playerIds: readonly string[],
  correct: string,
  window: { openedAt: number; endsAt: number },
): Record<string, number> {
  return Object.fromEntries(
    playerIds.map((id) => [id, scoreMatch(answers[id], correct, window)]),
  );
}

/** A prompt from the wire, checked: a phone treats what arrives as untrusted. */
export function readMatchPrompt(x: unknown): MatchPrompt | null {
  if (typeof x !== 'object' || x === null) return null;
  const p = x as Partial<MatchPrompt>;
  if (
    p.game !== 'match-reply' ||
    typeof p.claim !== 'string' ||
    !Array.isArray(p.choices) ||
    typeof p.round !== 'number' ||
    typeof p.rounds !== 'number' ||
    typeof p.seconds !== 'number'
  )
    return null;
  const choices = p.choices
    .filter(
      (c): c is MatchChoice =>
        typeof c === 'object' &&
        c !== null &&
        typeof c.id === 'string' &&
        typeof c.text === 'string',
    )
    .slice(0, MATCH_MAX_CHOICES);
  if (choices.length < 2) return null;
  return {
    game: 'match-reply',
    round: p.round,
    rounds: p.rounds,
    claim: p.claim.slice(0, 600),
    chapter: typeof p.chapter === 'string' ? p.chapter : undefined,
    choices: choices.map((c) => ({ id: c.id, text: c.text.slice(0, 600) })),
    seconds: p.seconds,
  };
}

/** A solution from the wire, checked. */
export function readMatchSolution(x: unknown): MatchSolution | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Partial<MatchSolution>;
  if (typeof s.correct !== 'string' || !Array.isArray(s.lines)) return null;
  const href =
    typeof s.href === 'string' && /^\/answers\/[\w-]+\/$/.test(s.href)
      ? s.href
      : '/answers/';
  return {
    correct: s.correct,
    lines: s.lines.filter((l): l is string => typeof l === 'string'),
    sources: Array.isArray(s.sources)
      ? s.sources.filter(
          (src): src is { publisher: string; url: string } =>
            typeof src?.publisher === 'string' &&
            typeof src?.url === 'string' &&
            /^https:\/\//.test(src.url),
        )
      : [],
    href,
  };
}
