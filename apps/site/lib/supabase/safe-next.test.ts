import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeNext } from './safe-next.ts';

const HOME = '/account/';

// Every one of these must land on the default path, not on another site.
const hostile: [string, string | null | undefined][] = [
  ['protocol-relative', '//evil.com'],
  ['tab between slashes', '/\t/evil.com'],
  ['newline between slashes', '/\n/evil.com'],
  ['carriage return between slashes', '/\r/evil.com'],
  ['slash then backslash', '/\\evil.com'],
  ['backslash then slash', '\\/evil.com'],
  ['two backslashes', '\\\\evil.com'],
  ['backslash later in the path', '/ok\\evil.com'],
  ['absolute url', 'https://evil.com'],
  ['javascript url', 'javascript:alert(1)'],
  ['leading space', '  /x'],
  ['trailing space', '/x '],
  ['control character', '/x\u0001y'],
  ['no leading slash', 'evil.com'],
  ['empty', ''],
  ['null', null],
  ['undefined', undefined],
];

for (const [name, input] of hostile) {
  test(`safeNext refuses: ${name}`, () => {
    assert.equal(safeNext(input), HOME);
  });
}

const allowed = [
  '/',
  '/ok/path?x=1#y',
  '/account/',
  '/sign-in/?next=/account/',
];

for (const input of allowed) {
  test(`safeNext keeps ${input}`, () => {
    assert.equal(safeNext(input), input);
  });
}

// An encoded slash is still a path on this site: a browser does not decode it before
// resolving the address, so it can never become "//". Kept as given.
test('safeNext keeps an encoded double slash as a path on this site', () => {
  assert.equal(safeNext('/%2F%2Fevil.com'), '/%2F%2Fevil.com');
  assert.equal(
    new URL('/%2F%2Fevil.com', 'http://site.invalid').host,
    'site.invalid',
  );
});
