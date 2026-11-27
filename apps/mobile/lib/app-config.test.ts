import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const { expo } = JSON.parse(
  readFileSync(new URL('../app.json', import.meta.url), 'utf8'),
);

// The app is portrait only. On iPad, Apple requires every orientation (for split view and slide
// over) unless the app opts out with UIRequiresFullScreen, which is `ios.requireFullScreen`. Without
// it the build is rejected or the app is rotated into layouts it was never drawn for.
test('a portrait-only app that runs on iPad says it needs the full screen', () => {
  if (expo.orientation === 'portrait' && expo.ios.supportsTablet)
    assert.equal(expo.ios.requireFullScreen, true);
});
