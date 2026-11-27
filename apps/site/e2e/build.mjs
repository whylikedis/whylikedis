// Build the site the browser checks test: the normal build, with the settings in e2e/env.mjs.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_ENV } from './env.mjs';
import { STAMP } from './require-build.mjs';

execSync('npm run build', {
  stdio: 'inherit',
  env: { ...process.env, ...E2E_ENV },
});

// A plain build wipes .next, so the stamp's presence means this build was the last one made.
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '.next', STAMP),
  JSON.stringify(E2E_ENV),
);
