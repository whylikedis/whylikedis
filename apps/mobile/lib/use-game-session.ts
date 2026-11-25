// Runs one round of any game on a screen: deals it once (fixed until the round ends, so an answer
// mid-round never reshuffles it), steps the session, and writes each answer and the finished round
// to the player's log. A screen renders `session` and calls `reveal` and `answer`; it holds no
// rules and no storage of its own.
import { useCallback, useRef, useState } from 'react';
import { dayKey } from '../interlace/games/daily.ts';
import {
  currentItem,
  startSession,
  step,
  summarize,
  type Session,
} from './engine/session.ts';
import { modeOf, type Game } from './engine/types.ts';
import { usePlayer } from './player.tsx';

export function useGameSession<Item extends { id: string }, Answer, Content>(
  game: Game<Item, Answer, Content>,
  modeId: string,
  content: Content,
) {
  const { history, recordAnswer, recordRound } = usePlayer();
  const [session, setSession] = useState<Session<Item, Answer>>(() => {
    const mode = modeOf(game, modeId) ?? game.modes[0];
    const day = dayKey();
    return startSession(game, mode, game.deal({ content, history, day, mode }));
  });
  // The day the round was dealt on: a round started before midnight counts for that day.
  const day = useRef(dayKey()).current;
  const current = useRef(session);

  const dispatch = useCallback(
    (action: Parameters<typeof step<Item, Answer, Content>>[2]) => {
      const prev = current.current;
      const next = step(game, prev, action);
      if (next === prev) return;
      current.current = next;
      const where = { game: game.id, mode: next.mode.id, day };
      if (next.answered.length > prev.answered.length) {
        const a = next.answered[next.answered.length - 1];
        recordAnswer(where, a.item.id, a.score);
      }
      if (next.phase === 'done' && prev.phase !== 'done') {
        const s = summarize(next);
        recordRound(where, { points: s.points, max: s.max }, s.answered);
      }
      setSession(next);
    },
    [game, day, recordAnswer, recordRound],
  );

  const reveal = useCallback(() => dispatch({ type: 'reveal' }), [dispatch]);
  const answer = useCallback(
    (a: Answer) => dispatch({ type: 'answer', answer: a }),
    [dispatch],
  );

  return {
    session,
    item: currentItem(session),
    summary: summarize(session),
    day,
    reveal,
    answer,
  };
}
