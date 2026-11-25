// One round of any game, as a reducer: deal, reveal, answer, done. Screens render a session and
// dispatch actions; they hold no rules of their own, so every game gets the same flow, the same
// guards (no double answers, no answering past the end) and the same summary.
import type { Game, Mode, Score } from './types.ts';

export type Phase = 'question' | 'revealed' | 'done';

export type Answered<Item, Answer> = {
  item: Item;
  answer: Answer;
  score: Score;
};

export type Session<Item, Answer> = {
  game: string;
  mode: Mode;
  items: readonly Item[];
  index: number;
  phase: Phase;
  answered: readonly Answered<Item, Answer>[];
};

export type Action<Answer> =
  { type: 'reveal' } | { type: 'answer'; answer: Answer };

export function startSession<Item extends { id: string }, Answer, Content>(
  game: Game<Item, Answer, Content>,
  mode: Mode,
  items: readonly Item[],
): Session<Item, Answer> {
  return {
    game: game.id,
    mode,
    items,
    index: 0,
    phase: items.length ? 'question' : 'done',
    answered: [],
  };
}

// The next session. An action that does not fit the phase returns the same object, so a double
// tap or a late callback changes nothing and React skips the render.
export function step<Item extends { id: string }, Answer, Content>(
  game: Game<Item, Answer, Content>,
  s: Session<Item, Answer>,
  action: Action<Answer>,
): Session<Item, Answer> {
  if (s.phase === 'done') return s;
  switch (action.type) {
    case 'reveal':
      return s.phase === 'question' ? { ...s, phase: 'revealed' } : s;
    case 'answer': {
      const item = s.items[s.index];
      const score = game.judge(item, action.answer);
      const index = s.index + 1;
      return {
        ...s,
        index,
        phase: index >= s.items.length ? 'done' : 'question',
        answered: [...s.answered, { item, answer: action.answer, score }],
      };
    }
  }
}

export const currentItem = <Item, Answer>(s: Session<Item, Answer>) =>
  s.phase === 'done' ? undefined : s.items[s.index];

export type Summary = {
  points: number;
  max: number;
  answered: number;
  perfect: boolean;
};

export function summarize<Item, Answer>(s: Session<Item, Answer>): Summary {
  const points = s.answered.reduce((n, a) => n + a.score.points, 0);
  const max = s.answered.reduce((n, a) => n + a.score.max, 0);
  return {
    points,
    max,
    answered: s.answered.length,
    perfect: max > 0 && points === max,
  };
}
