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
