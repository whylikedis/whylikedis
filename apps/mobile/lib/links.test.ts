import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isWebUrl, openSource } from './links.ts';
import { dateLabel } from './dates.ts';
import { firstParam, roundMode } from './route-params.ts';

test('only web addresses are opened', () => {
  assert.ok(isWebUrl('https://www.un.org/en/'));
  assert.ok(isWebUrl('http://example.org/a'));
  for (const bad of [
    '',
    'not a url',
    'tel:123',
    'whylikedis://about',
    'javascript:1',
    undefined,
    4,
  ])
    assert.equal(isWebUrl(bad), false, String(bad));
});

test('a refused or malformed source link is reported, never thrown', async () => {
  const seen: string[] = [];
  const onError = (_e: unknown, where: string) => seen.push(where);
  assert.equal(
    await openSource('https://a.org/', async () => 1, onError),
    true,
  );
  assert.equal(
    await openSource(
      'https://a.org/',
      () => Promise.reject(new Error('no browser')),
      onError,
    ),
    false,
  );
  let opened = 0;
  assert.equal(
    await openSource('tel:123', async () => void opened++, onError),
    false,
  );
  assert.equal(opened, 0);
  assert.deepEqual(seen, ['link', 'link']);
});

test('a bad date gives no label instead of a crash', () => {
  const f = new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    dateStyle: 'medium',
  });
  assert.equal(dateLabel(f, new Date('2026-11-02T00:00:00Z')), 'Nov 2, 2026');
  assert.equal(dateLabel(f, new Date('nope')), null);
  assert.throws(() => f.format(new Date('nope')), RangeError);
});

test('deep link parameters are normalised, and an unknown round is not played', () => {
  assert.equal(firstParam(['a', 'b']), 'a');
  assert.equal(firstParam(''), undefined);
  assert.equal(firstParam(undefined), undefined);
  assert.equal(roundMode('daily'), 'daily');
  assert.equal(roundMode(['practice']), 'practice');
  assert.equal(roundMode('whatever'), null);
  assert.equal(roundMode(undefined), null);
});
