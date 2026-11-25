import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// This is Interlace's games/daily, the calendar every daily puzzle is dealt by. The app syncs its own
// copy from Interlace (apps/mobile/scripts/sync-interlace.mjs). If the two differ, the app and the
// site could deal different cards on the same day, so they must stay byte for byte the same: copy
// the app's file here after a sync.
test("the package's daily.ts is the app's synced Interlace copy", () => {
  const here = readFileSync(new URL('./daily.ts', import.meta.url), 'utf8');
  const app = readFileSync(
    new URL(
      '../../../../apps/mobile/interlace/games/daily.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.equal(here, app);
});

// The streak and progress arithmetic, the same way: the app's synced copies, with the one import
// written with its extension so Node runs it.
for (const name of ['streak-model', 'progress-model']) {
  test(`the package's ${name}.ts is the app's synced Interlace copy`, () => {
    const here = readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8');
    const app = readFileSync(
      new URL(
        `../../../../apps/mobile/interlace/games/${name}.ts`,
        import.meta.url,
      ),
      'utf8',
    );
    assert.equal(here, app.replace("from './daily';", "from './daily.ts';"));
  });
}
