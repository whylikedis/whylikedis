// The browser checks refuse a build that is not the e2e build, and say what to run.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const SCRIPT = join(__dirname, 'require-build.mjs');
const STAMP = 'e2e-env.json';
const check = (dir: string) =>
  spawnSync('node', [SCRIPT, dir], { encoding: 'utf8' });

test('a build with no stamp, or with other values, is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'build-'));
  try {
    const none = check(dir);
    expect(none.status).toBe(1);
    expect(none.stderr).toContain('not an e2e build');
    expect(none.stderr).toContain('npm run e2e:build');

    // The env the real stamp holds: what the script itself says is right.
    const env = JSON.parse(
      execFileSync(
        'node',
        [
          '-e',
          "import('./env.mjs').then((m)=>console.log(JSON.stringify(m.E2E_ENV)))",
        ],
        { cwd: __dirname, encoding: 'utf8' },
      ),
    );
    writeFileSync(
      join(dir, STAMP),
      JSON.stringify({ ...env, NEXT_PUBLIC_SUPABASE_URL: '' }),
    );
    const wrong = check(dir);
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL');

    writeFileSync(join(dir, STAMP), JSON.stringify(env));
    expect(check(dir).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('the build under test has accounts on: Sign in is in the bar', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();
});
