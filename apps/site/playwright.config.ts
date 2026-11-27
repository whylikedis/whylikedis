import { defineConfig, devices } from '@playwright/test';

/**
 * The site's browser checks (e2e/). They run against the BUILT site (`npm run e2e:build`), never
 * the dev server, whose lazy compilation makes timing nondeterministic.
 *
 * The build they test has accounts and analytics switched on, pointed at hosts that do not exist
 * (e2e/env.mjs). Every request to those hosts is answered inside the test (e2e/fake-backend.ts), so
 * the sign-in, account and booking screens can be walked, and nothing ever leaves the machine.
 *
 * Two kinds of check share this config:
 *   - `ux`: journeys, states, accessibility and layout. No pixels, so they run anywhere.
 *   - `visual`: screenshots of every page against e2e/baselines. Pixels differ between machines,
 *     so they run only in the Playwright image pinned to the installed version (e2e/docker.sh).
 *     `npm run e2e:docker` runs both there, exactly as CI does.
 */
const PORT = 4174;

export default defineConfig({
  testDir: './e2e',
  // Refuses a build that is not the e2e build (a git hook's plain build, say).
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a retry hides a flaky check instead of fixing its cause.
  retries: 0,
  reporter: process.env.CI ? [['dot'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    timezoneId: 'America/New_York',
    locale: 'en-US',
    // Determinism: every Reveal and transition completes at once. The checks that need motion on
    // turn it back on themselves.
    reducedMotion: 'reduce',
    trace: 'off',
  },
  projects: [
    {
      name: 'ux',
      testIgnore: 'visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // One platform (the pinned image), so baselines carry no platform suffix.
      name: 'visual',
      testMatch: 'visual.spec.ts',
      snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
      use: {
        ...devices['Desktop Chrome'],
        // Same image, different CPU: Skia picks drawing code for the CPU it runs on, so text
        // edges differed by a few hundred pixels between a laptop and CI. These flags take the
        // generic paths everywhere.
        launchOptions: {
          args: [
            '--disable-skia-runtime-opts',
            '--disable-gpu',
            '--disable-lcd-text',
            '--force-color-profile=srgb',
            '--font-render-hinting=none',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npx --no next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
