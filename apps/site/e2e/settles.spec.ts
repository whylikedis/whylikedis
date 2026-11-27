// A page that is ready stays the same picture. The nightly browser check (ui-nightly) takes up to
// three full-page screenshots a moment apart and needs two alike; thirteen pages never gave it two.
// The cause was not motion but rounding: the plate round the wordmark in the sticky bar, and the
// faces of a flip card, were drawn once and then once more a little different (one level of one
// colour on a rounded corner). A reader never saw it; a screenshot comparison cannot tell it from
// a change. These checks take the same frames, on a slow CPU as a slow runner has, and want them all
// alike. Chromium only: the slow CPU is a Chromium switch.
import { expect, settle, test } from './fixtures';

const FRAMES = 5;
const PAGES = ['/', '/questions/', '/daily/', '/how-we-check/'];
const WIDTHS = { phone: 390, tablet: 820, desktop: 1440 } as const;

test.describe('a ready page does not change between screenshots', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'uses Chromium CPU throttling',
  );

  for (const [name, width] of Object.entries(WIDTHS)) {
    for (const path of PAGES) {
      test(`${path} at ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.goto(path);
        await settle(page);
        await page.waitForTimeout(100);
        const frames: Buffer[] = [];
        for (let i = 0; i < FRAMES; i++) {
          frames.push(
            await page.screenshot({ fullPage: true, animations: 'disabled' }),
          );
          await page.waitForTimeout(60);
        }
        const changed = frames
          .map((f, i) => (i > 0 && !f.equals(frames[i - 1]) ? i : 0))
          .filter(Boolean);
        expect(
          changed,
          `frames (1-based from the second) that differ from the one before`,
        ).toEqual([]);
      });
    }
  }
});

test.describe('a flip card with reduced motion', () => {
  test('stays in the plane: it fades, it is not a 3D scene', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);
    const style = await page
      .locator('[data-slot="flip-card-inner"]')
      .first()
      .evaluate((el) => getComputedStyle(el).transformStyle);
    expect(style).toBe('flat');
  });

  test.describe('and with motion', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('still turns in 3D', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      const style = await page
        .locator('[data-slot="flip-card-inner"]')
        .first()
        .evaluate((el) => getComputedStyle(el).transformStyle);
      expect(style).toBe('preserve-3d');
    });
  });
});

test.describe('the bar does not move when the session is read', () => {
  // Without JavaScript the page is what the server sent, the first paint: no session has been read.
  // With it, once the session is read, "Sign in" is there. The button before it must already have
  // its room, so the reading-settings button beside it stays where it was.
  for (const [name, width] of Object.entries(WIDTHS)) {
    test(`at ${name}`, async ({ browser, page, baseURL }) => {
      const left = (p: typeof page) =>
        p
          .getByRole('banner')
          .getByRole('button', { name: 'Reading settings' })
          .evaluate((e) => Math.round(e.getBoundingClientRect().left));

      const bare = await browser.newContext({
        baseURL,
        javaScriptEnabled: false,
        viewport: { width, height: 900 },
      });
      const first = await bare.newPage();
      await first.goto('/');
      const atFirstPaint = await left(first);
      await bare.close();

      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await settle(page);
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Sign in' }),
      ).toBeVisible();
      expect(await left(page)).toBe(atFirstPaint);
    });
  }
});
