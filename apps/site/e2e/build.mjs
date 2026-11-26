// Build the site the browser checks test: the normal build, with the settings in e2e/env.mjs.
import { execSync } from 'node:child_process';
import { E2E_ENV } from './env.mjs';

execSync('npm run build', {
  stdio: 'inherit',
  env: { ...process.env, ...E2E_ENV },
});
