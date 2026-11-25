import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reportError, recentErrors, setReporter, installGlobalHandler, type ErrorReport } from '../errors/report.ts';
import { SECTIONS, sectionProblems } from './sections.ts';

test('the section list is sound, and every section has its route file', () => {
  assert.deepEqual(sectionProblems(SECTIONS), []);
  const routes = readdirSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../app/(tabs)'),
  ).map((f) =>
    f.replace(/\.tsx$/, ''),
  );
  for (const s of SECTIONS) assert.ok(routes.includes(s.route), `app/(tabs)/${s.route}.tsx`);
});

test('the section checks catch the mistakes they name', () => {
  const [a, b] = SECTIONS;
  assert.deepEqual(sectionProblems([a, { ...b, id: a.id }]), [`duplicate id: ${a.id}`]);
  assert.deepEqual(sectionProblems([{ ...a, enabled: false }]), ['no section is enabled']);
  assert.deepEqual(sectionProblems([b]), ['the first section must be the index route']);
});

test('errors reach the reporter, a broken reporter is contained, and recent errors are kept', () => {
  const seen: ErrorReport[] = [];
  setReporter((r) => seen.push(r));
  reportError(new Error('boom'), 'test');
  reportError('a string', 'test');
  assert.deepEqual(seen.map((r) => r.message), ['boom', 'a string']);
  setReporter(() => {
    throw new Error('reporter down');
  });
  assert.doesNotThrow(() => reportError(new Error('again'), 'test'));
  setReporter(null);
  for (let i = 0; i < 40; i++) reportError(new Error(`e${i}`), 'flood');
  assert.equal(recentErrors().length, 25);
  assert.equal(recentErrors().at(-1)?.message, 'e39');
});

test('the global handler reports, then passes the error on, and installs once', () => {
  const seen: ErrorReport[] = [];
  setReporter((r) => seen.push(r));
  const passed: unknown[] = [];
  let handler = (e: unknown, _fatal?: boolean) => void passed.push(e);
  const utils = {
    getGlobalHandler: () => handler,
    setGlobalHandler: (h: typeof handler) => {
      handler = h;
    },
  };
  installGlobalHandler(utils);
  installGlobalHandler(utils);
  handler(new Error('uncaught'), true);
  assert.equal(passed.length, 1);
  assert.deepEqual(seen.map((r) => [r.where, r.fatal]), [['uncaught', true]]);
  setReporter(null);
});
