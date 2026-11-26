import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STREAK_MILESTONES } from './progress.ts';
import {
  SHARE_RESULT_SLUGS,
  shareResultCopy,
  shareResultOf,
  shareSlug,
} from './share.ts';

test('a milestone reached today wins over the rating', () => {
  assert.equal(shareSlug('had-it'), 'had-it');
  assert.equal(shareSlug('not-yet'), 'not-yet');
  assert.equal(shareSlug('not-yet', 7), 'streak-7');
  assert.equal(shareSlug('had-it', 8), 'had-it');
});

test('every slug reads back, and nothing else does', () => {
  assert.equal(SHARE_RESULT_SLUGS.length, 2 + STREAK_MILESTONES.length);
  for (const slug of SHARE_RESULT_SLUGS) assert.ok(shareResultOf(slug), slug);
  for (const bad of ['', 'streak-8', 'streak-', 'had_it', 'streak-7x'])
    assert.equal(shareResultOf(bad), null, bad);
});

test('each result has its own words', () => {
  const titles = SHARE_RESULT_SLUGS.map(
    (s) => shareResultCopy(shareResultOf(s)!).title,
  );
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(
    shareResultCopy({ kind: 'streak', days: 7 }).title,
    '7-day streak. A whole week of replies.',
  );
});
