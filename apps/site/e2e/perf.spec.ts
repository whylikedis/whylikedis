// What a reader waits for and what moves under them, measured in the browser: no layout shift as the
// sessions form replaces its placeholder, and the Supabase client (about 70 kB of script) is not in
// what a page asks for up front. The size budget (check-budget.mjs) holds the totals.
import { expect, settle, test } from './fixtures';

test('the sessions page does not shift when the form replaces its placeholder', async ({
  page,
}) => {
  // A phone, where the placeholder was 350px shorter than the form and moved the footer.
  await page.setViewportSize({ width: 412, height: 823 });
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[])
        if (!e.hadRecentInput)
          (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/sessions/');
  await settle(page);
  await expect(page.locator('main form')).toBeVisible();
  await page.waitForTimeout(300);
  const cls = await page.evaluate(
    () => (window as unknown as { __cls: number }).__cls,
  );
  expect(cls).toBeLessThan(0.01);
});

test('the Supabase client is not among the scripts a page asks for up front', async ({
  request,
}) => {
  for (const path of ['/', '/daily/', '/how-we-check/', '/sessions/']) {
    const html = await (await request.get(path)).text();
    const chunks = [
      ...new Set(
        [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)].map(
          (m) => m[1],
        ),
      ),
    ];
    for (const src of chunks) {
      const js = await (await request.get(src)).text();
      expect(js, `${path}: ${src}`).not.toContain(
        '@supabase/supabase-js.traceContex',
      );
    }
  }
});

// The question on /daily/ is the largest thing on the page, so when it paints is when the page
// counts as loaded. It is in the server HTML, and it must also be painted at full strength, not
// faded in: a fade on first load (a CSS `starting` style on the puzzle's body) held the paint of
// the text back by its 150ms and put the mobile Lighthouse LCP 2.7s behind the other pages.
test.describe('the daily question on first paint', () => {
  // The suite runs with motion off; the fade only exists with motion on.
  test.use({ reducedMotion: 'no-preference' });

  test('is in the server HTML', async ({ request }) => {
    const html = await (await request.get('/daily/')).text();
    expect(html).toContain('data-slot="recall-card-prompt"');
  });

  test('is not faded in', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __body: unknown };
      document.addEventListener('DOMContentLoaded', () => {
        requestAnimationFrame(() => {
          const body = document.querySelector(
            '[data-slot="daily-puzzle-body"]',
          );
          w.__body = body && {
            running: body.getAnimations().length,
            opacity: getComputedStyle(body).opacity,
          };
        });
      });
    });
    await page.goto('/daily/');
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __body: unknown }).__body),
      )
      .toEqual({ running: 0, opacity: '1' });
  });
});
