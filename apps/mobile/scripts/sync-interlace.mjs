#!/usr/bin/env node
/**
 * Copy Interlace's native layer into this app, the way the site takes Interlace's web components:
 * as source in our tree, owned by us from then on, refreshed on purpose.
 *
 *   node scripts/sync-interlace.mjs [path to an interlace checkout]   (default: ../../../interlace)
 *
 * It copies `packages/native/src` to `interlace/native/` and the pure game models the native games
 * score with (`packages/ui/src/games/*-model.ts`, `daily.ts`) to `interlace/games/`. Imports of
 * `@interlace/ui/games/<model>` become relative imports of those copies. `interlace/source.json`
 * records the commit, so a review can see which Interlace this app runs.
 *
 * Never edit the copies: a missing piece is built in Interlace, then synced here.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FROM = path.resolve(
  process.argv[2] ?? path.join(APP, '../../../interlace'),
);
const OUT = path.join(APP, 'interlace');
const MODELS = [
  'daily.ts',
  'closer-model.ts',
  'streak-model.ts',
  'progress-model.ts',
  'share-model.ts',
];

if (!existsSync(path.join(FROM, 'packages/native/src'))) {
  console.error(
    `sync-interlace: no Interlace checkout with packages/native at ${FROM}`,
  );
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

rmSync(path.join(OUT, 'native'), { recursive: true, force: true });
rmSync(path.join(OUT, 'games'), { recursive: true, force: true });
cpSync(path.join(FROM, 'packages/native/src'), path.join(OUT, 'native'), {
  recursive: true,
});
mkdirSync(path.join(OUT, 'games'), { recursive: true });
for (const m of MODELS)
  cpSync(
    path.join(FROM, 'packages/ui/src/games', m),
    path.join(OUT, 'games', m),
  );

// Metro resolves the TypeScript file, so `./daily.js` (Node16-style) becomes `./daily`.
for (const file of walk(OUT).filter((f) => /\.tsx?$/.test(f))) {
  const src = readFileSync(file, 'utf8');
  const out = src
    .replace(/from '@interlace\/ui\/games\/([\w-]+)'/g, (_, name) => {
      const rel = path
        .relative(path.dirname(file), path.join(OUT, 'games', name))
        .split(path.sep)
        .join('/');
      return `from '${rel.startsWith('.') ? rel : `./${rel}`}'`;
    })
    .replace(/from '(\.{1,2}\/[\w./-]+)\.js'/g, "from '$1'");
  if (out !== src) writeFileSync(file, out);
}

const git = (...args) =>
  execFileSync('git', ['-C', FROM, ...args], { encoding: 'utf8' }).trim();
writeFileSync(
  path.join(OUT, 'source.json'),
  `${JSON.stringify({ repository: 'https://github.com/ofri-peretz/interlace', commit: git('rev-parse', 'HEAD') }, null, 2)}\n`,
);
console.log(
  `sync-interlace: copied Interlace ${git('rev-parse', '--short', 'HEAD')} into interlace/`,
);
