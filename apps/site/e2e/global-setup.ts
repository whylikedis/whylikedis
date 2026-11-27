// Every run starts by checking the build is the e2e build (see require-build.mjs). A separate
// process: that file is an ES module, and loading it here would change how Playwright loads env.mjs.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default function globalSetup() {
  try {
    execFileSync('node', [join(__dirname, 'require-build.mjs')], {
      stdio: 'pipe',
    });
  } catch (e) {
    throw new Error(String((e as { stderr?: Buffer }).stderr ?? e));
  }
}
