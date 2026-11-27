// Every Interlace file the site vendors must be one Interlace main has shipped.
//
// The site takes Interlace items as their built registry files write them
// (AGENTS.md: "WhyLikeDis adopts what Interlace releases"). Twice a file came
// from somewhere else: calendar-model.ts copied from source, without its
// version banner (site #49), and streak/share-card copied from an Interlace
// pull request that was still open (site #65), under a banner naming a
// release they did not match. A content check catches both.
//
// Usage: node apps/site/interlace-vendored.mjs <path to an ofri-peretz/interlace clone with history>
//
// For each file in the site that some Interlace registry item installs (its
// `target`), the file's bytes must equal what that item shipped in some
// commit of Interlace main's apps/registry/public/r. Being behind the latest
// release is fine: the adoption run takes releases. Being ahead, edited, or
// reformatted is not.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = dirname(fileURLToPath(import.meta.url));
const REGISTRY = 'apps/registry/public/r';

// Taken from an open Interlace pull request before it merged. Each entry
// names the pull request; delete the entry once the file matches a release.
const KNOWN_AHEAD = {};

const interlace = process.argv[2];
if (!interlace || !existsSync(join(interlace, REGISTRY))) {
  console.error(
    'usage: node interlace-vendored.mjs <interlace clone with apps/registry/public/r>',
  );
  process.exit(2);
}

const git = (...args) =>
  execFileSync('git', ['-C', interlace, ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
const hash = (text) => createHash('sha256').update(text).digest('hex');

/** target -> set of content hashes shipped for it on main, ever. */
const shipped = new Map();
function take(json) {
  let item;
  try {
    item = JSON.parse(json);
  } catch {
    return;
  }
  for (const file of item.files ?? []) {
    if (!file.target || typeof file.content !== 'string') continue;
    if (!shipped.has(file.target)) shipped.set(file.target, new Set());
    shipped.get(file.target).add(hash(file.content));
  }
}

const commits = git('log', '--format=%H', 'HEAD', '--', REGISTRY)
  .split('\n')
  .filter(Boolean);
for (const commit of commits) {
  const paths = git(
    'diff-tree',
    '--root',
    '--no-commit-id',
    '--name-only',
    '--diff-filter=AM',
    '-r',
    commit,
    '--',
    REGISTRY,
  )
    .split('\n')
    .filter((p) => p.endsWith('.json'));
  for (const path of paths) {
    take(git('show', `${commit}:${path}`));
  }
}

const failures = [];
const stale = [];
let checked = 0;
for (const [target, hashes] of shipped) {
  const file = join(SITE, target);
  if (!existsSync(file)) continue;
  checked++;
  const ok = hashes.has(hash(readFileSync(file, 'utf8')));
  if (target in KNOWN_AHEAD) {
    if (ok) stale.push(`${target} (${KNOWN_AHEAD[target]})`);
  } else if (!ok) {
    failures.push(target);
  }
}

console.log(
  `interlace-vendored: ${checked} vendored files, ${commits.length} registry commits read`,
);
for (const entry of stale) {
  console.log(
    `note: ${entry} now matches a release; delete it from KNOWN_AHEAD`,
  );
}
if (failures.length) {
  console.error(
    '\nThese files match nothing Interlace main has shipped. Install them from the built\n' +
      "registry item (apps/registry/public/r/<item>.json, each file's `content` at its\n" +
      '`target`), never from source or an open pull request, and do not edit or reformat\n' +
      'them here; a change belongs in Interlace.\n\n' +
      failures.map((f) => `  apps/site/${f}`).join('\n'),
  );
  process.exit(1);
}
