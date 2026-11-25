import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoryStorage } from '@whylikedis/games';
import { ERRORS_KEY, installErrorLog } from './log.ts';
import { recentErrors, reportError, setReporter } from './report.ts';

test('errors from an earlier session are restored and new ones kept on disk', async () => {
  const earlier = {
    at: 1,
    where: 'uncaught',
    message: 'last time',
    fatal: true,
  };
  const storage = memoryStorage({
    [ERRORS_KEY]: JSON.stringify({
      version: 1,
      errors: [earlier, { junk: 1 }],
    }),
  });
  await installErrorLog(storage);
  assert.ok(recentErrors().some((r) => r.message === 'last time'));
  reportError(new Error('this time'), 'test');
  await new Promise((r) => setTimeout(r, 10));
  const kept = JSON.parse(storage.data.get(ERRORS_KEY)!).errors.map(
    (r: { message: string }) => r.message,
  );
  assert.ok(kept.includes('last time') && kept.includes('this time'));
  setReporter(null);
});
