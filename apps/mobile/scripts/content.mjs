#!/usr/bin/env node
/**
 * Write content/pack.json, the answers the app bundles, from the fact base.
 *
 * It runs the site's export (which runs the gate's rules) and projects the result with
 * @whylikedis/content's `appPack`. A store build ships verified cards only, as the hosted site
 * does. `APP_PREVIEW=1` is the local preview, where drafts show too, labelled as still being
 * checked. Nothing here is written by hand: edit the cards in facts/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(APP, '../site');
const preview = process.env.APP_PREVIEW === '1';

execFileSync('python3', [path.join(SITE, 'export.py')], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
const site = JSON.parse(
  readFileSync(path.join(SITE, 'data/site.json'), 'utf8'),
);

// The pack is projected by the shared package, run with Node's TypeScript support.
const out = execFileSync(
  process.execPath,
  [
    '--experimental-strip-types',
    '--no-warnings',
    '--input-type=module',
    '-e',
    `import { appPack } from '@whylikedis/content';
     let s = ''; for await (const c of process.stdin) s += c;
     process.stdout.write(JSON.stringify(appPack(JSON.parse(s), { preview: ${preview} })));`,
  ],
  { input: JSON.stringify(site), cwd: APP, maxBuffer: 64 * 1024 * 1024 },
);
const pack = JSON.parse(out.toString());
mkdirSync(path.join(APP, 'content'), { recursive: true });
writeFileSync(path.join(APP, 'content/pack.json'), `${JSON.stringify(pack)}\n`);
console.log(
  `content: ${pack.cards.length} answers${preview ? ' (preview: drafts included)' : ''}`,
);
