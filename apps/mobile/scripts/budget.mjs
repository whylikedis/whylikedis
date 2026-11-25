#!/usr/bin/env node
/**
 * Hold the app to its size budgets (budget.json) after `expo export`: the Hermes bytecode each
 * platform starts from, and the bundled content pack. Startup time grows with what the engine
 * has to load, so a budget is the cheapest performance test there is, and it runs without a
 * device. Prints every number, fails on any over budget.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const budget = JSON.parse(readFileSync(path.join(APP, 'budget.json'), 'utf8'));
const kb = (n) => `${(n / 1000).toFixed(0)} kB`;

function check(measured, limits) {
  return Object.entries(measured).map(([name, size]) => ({
    name,
    size,
    limit: limits[name],
    over: limits[name] == null || size > limits[name],
  }));
}

function bytecode(platform) {
  const dir = path.join(APP, 'dist/_expo/static/js', platform);
  const files = readdirSync(dir).filter((f) => f.endsWith('.hbc'));
  if (files.length === 0)
    throw new Error(`no Hermes bytecode in ${dir}: run expo export first`);
  return files.reduce((n, f) => n + statSync(path.join(dir, f)).size, 0);
}

const rows = [
  ...check(
    { ios: bytecode('ios'), android: bytecode('android') },
    budget.hermesBytecode,
  ).map((r) => ({ ...r, name: `Hermes bytecode, ${r.name}` })),
  ...check(
    { 'content pack': statSync(path.join(APP, 'content/pack.json')).size },
    { 'content pack': budget.contentPack },
  ),
];
for (const r of rows)
  console.log(
    `${r.over ? 'OVER' : 'ok  '} ${r.name}: ${kb(r.size)} of ${kb(r.limit ?? 0)}`,
  );
if (rows.some((r) => r.over)) {
  console.error(
    'budget: over. Cut what grew, or raise the budget on purpose in its own commit.',
  );
  process.exit(1);
}
