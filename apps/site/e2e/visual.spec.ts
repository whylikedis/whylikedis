// Every page as a reader sees it, at a phone, a tablet and a desktop width, light and dark,
// against e2e/baselines. Runs only in the pinned Playwright image (e2e/docker.sh): pixels differ
// between machines. An intended change: `npm run e2e:docker:update`, then commit the PNGs.
import { DESKTOP, PHONE, TABLET } from './conditions';
import { expect, settle, test } from './fixtures';
import { PAGES } from './pages';

test.skip(
  !process.env.SITE_E2E_DOCKER,
  'screenshots run only in the pinned image: npm run e2e:docker',
);

const WIDTHS = { 390: PHONE, 820: TABLET, 1440: DESKTOP } as const;

for (const scheme of ['light', 'dark'] as const) {
  for (const [w, viewport] of Object.entries(WIDTHS)) {
    test.describe(`${scheme} ${w}`, () => {
      test.use({ viewport, colorScheme: scheme });
      for (const p of PAGES.filter((p) => p.visual)) {
        test(p.name, async ({ page }) => {
          if (p.name === 'not-found')
            test
              .info()
              .annotations.push({ type: 'console-error', description: '404' });
          await page.goto(p.path);
          await settle(page);
          await expect(page).toHaveScreenshot(`${scheme}/${w}/${p.name}.png`, {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
          });
        });
      }
    });
  }
}
