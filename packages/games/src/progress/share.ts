// Where a shared result points. A shared daily result links to a small page of its own, so the
// link unfurls into a picture of that result ("I had my reply ready", "7-day streak") instead of
// the plain daily page. The pages are few and fixed (two results, one per milestone), so they are
// built once with the site, and none of them gives away the day's answer.
import type { Rating } from '../games/what-would-you-say.ts';
import { STREAK_MILESTONES } from './progress.ts';
import { milestoneWords } from './round.ts';

export type ShareResult =
  | { kind: 'result'; rating: 'had-it' | 'not-yet' }
  | { kind: 'streak'; days: number };

/** The slug of every result page, as `/daily/s/<slug>/`. */
export const SHARE_RESULT_SLUGS: readonly string[] = [
  'had-it',
  'not-yet',
  ...STREAK_MILESTONES.map((d) => `streak-${d}`),
];

/** The page a result links to: a milestone reached today wins over the rating. */
export function shareSlug(rating: Rating, milestone?: number): string {
  if (milestone !== undefined && STREAK_MILESTONES.includes(milestone))
    return `streak-${milestone}`;
  return rating === 'had-it' ? 'had-it' : 'not-yet';
}

export function shareResultOf(slug: string): ShareResult | null {
  if (slug === 'had-it' || slug === 'not-yet')
    return { kind: 'result', rating: slug };
  const m = /^streak-(\d+)$/.exec(slug);
  if (m && STREAK_MILESTONES.includes(Number(m[1])))
    return { kind: 'streak', days: Number(m[1]) };
  return null;
}

/** What a result's page and picture say. The same words on both, and no answer in either. */
export function shareResultCopy(r: ShareResult): {
  title: string;
  description: string;
} {
  if (r.kind === 'streak')
    return {
      title: `${r.days}-day streak. ${milestoneWords(r.days)}`,
      description:
        'One thing people say about Israel each day, answered with sources.',
    };
  return r.rating === 'had-it'
    ? {
        title: 'I had my reply ready today.',
        description:
          'One thing people say about Israel each day. Think of your reply, then check it against the answer and its sources.',
      }
    : {
        title: 'Today’s one made me think.',
        description:
          'One thing people say about Israel each day. Think of your reply, then check it against the answer and its sources.',
      };
}
