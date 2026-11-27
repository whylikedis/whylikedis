// Refuse to run the browser checks on a build that is not the e2e build. `npm run build` (which the
// commit and push hooks run) wipes .next and builds without accounts and analytics, so a check run
// on it afterwards tests a site with no "Sign in" button and says nothing about it. e2e/build.mjs
// stamps the build with the env it used; this compares the stamp.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_ENV } from './env.mjs';

export const STAMP = 'e2e-env.json';

/** The reason the build in `nextDir` is not the e2e build, or null when it is. */
export function buildProblem(nextDir) {
  const file = join(nextDir, STAMP);
  if (!existsSync(file))
    return `${nextDir} is not an e2e build (no ${STAMP}). A plain \`npm run build\`, which the git hooks run, replaces it.`;
  let stamped;
  try {
    stamped = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return `${file} is not valid JSON.`;
  }
  const wrong = Object.keys(E2E_ENV).filter((k) => stamped[k] !== E2E_ENV[k]);
  return wrong.length
    ? `${nextDir} was built with other values for ${wrong.join(', ')} than e2e/env.mjs.`
    : null;
}

export function requireE2eBuild(nextDir) {
  const problem = buildProblem(nextDir);
  if (problem) {
    throw new Error(
      `${problem}\nRun: npm run e2e:build --workspace @whylikedis/site`,
    );
  }
}

// `node e2e/require-build.mjs [.next dir]`: exit 1 with the reason and the fix, or 0.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir =
    process.argv[2] ??
    join(dirname(fileURLToPath(import.meta.url)), '..', '.next');
  try {
    requireE2eBuild(dir);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
