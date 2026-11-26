// The states a reader lands in that a happy path never shows: storage turned off, the network
// gone, a slow or failing back end, long words, no JavaScript, a keyboard only, an address that
// leads nowhere.
import { PHONE } from './conditions';
import { expect, settle, test } from './fixtures';
import { SUPABASE } from './env.mjs';
import { PAGES } from './pages';

test.use({ viewport: PHONE });

test('storage turned off: the daily question still plays, and says what it earned', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/daily/');
  await settle(page);
  await page.locator('[data-slot="recall-card-reveal"]').click();
  await page.getByRole('button', { name: 'I had it' }).click();
  await expect(page.getByText('Today’s question, done')).toBeVisible();
});

test('offline after the page loaded: the daily question still plays', async ({
  page,
  context,
}) => {
  await page.goto('/daily/');
  await settle(page);
  await context.setOffline(true);
  await page.locator('[data-slot="recall-card-reveal"]').click();
  await page.getByRole('button', { name: 'I had it' }).click();
  await expect(page.getByText('Today’s question, done')).toBeVisible();
  await context.setOffline(false);
});

test('no network for the booking: it says so, and keeps what was typed', async ({
  page,
}) => {
  test.info().annotations.push({
    type: 'console-error',
    description: 'Failed to load resource',
  });
  await page.route(`${SUPABASE}/rest/v1/session_requests*`, (r) =>
    r.abort('internetdisconnected'),
  );
  await page.goto('/sessions/');
  await settle(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByRole('button', { name: /^Wednesday, December 2, 2026/ })
    .click();
  await page.getByRole('radio', { name: /1:00/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Dana');
  await page.getByRole('textbox', { name: 'Email' }).fill('dana@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Request the session' }).click();
  await expect(page.getByText('That did not go through')).toBeVisible();
  await expect(
    page.locator('[data-slot="multi-step-form-summary"]'),
  ).toContainText('dana@example.com');
});

test('a slow account: the page says it is loading, then shows the account', async ({
  page,
}) => {
  // Signed in through the code, then the account takes a while to answer.
  await page.goto('/sign-in/?next=/account/');
  await settle(page);
  await page.getByRole('textbox', { name: 'Email' }).fill('reader@example.com');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route(`${SUPABASE}/auth/v1/user*`, async (route) => {
    await held;
    await route.fallback();
  });
  await page
    .getByRole('textbox', { name: 'Code from the email' })
    .first()
    .click();
  await page.keyboard.type('123456');
  const loading = page.getByText('Loading your account…');
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  release();
  await expect(
    page.getByRole('heading', { name: 'Your details' }),
  ).toBeVisible();
});

test('long words: a long name and email never push the booking summary sideways at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/sessions/');
  await settle(page);
  await page
    .getByLabel('What would you like to talk about? (optional)')
    .fill('Zionism'.repeat(12));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByRole('button', { name: /^Wednesday, December 2, 2026/ })
    .click();
  await page.getByRole('radio', { name: /1:00/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByRole('textbox', { name: 'Name' })
    .fill('Wolfeschlegelsteinhausenbergerdorff-Montgomery');
  await page
    .getByRole('textbox', { name: 'Email' })
    .fill(`${'a'.repeat(40)}@a-very-long-domain-name.example.com`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.locator('[data-slot="multi-step-form-summary"]'),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('keyboard only: the daily question can be played without a mouse', async ({
  page,
}) => {
  await page.goto('/daily/');
  await settle(page);
  const reveal = page.locator('[data-slot="recall-card-reveal"]');
  for (
    let i = 0;
    i < 60 && !(await reveal.evaluate((el) => el === document.activeElement));
    i++
  )
    await page.keyboard.press('Tab');
  await expect(reveal).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'The answer' })).toBeFocused();
  const hadIt = page.getByRole('button', { name: 'I had it' });
  for (
    let i = 0;
    i < 60 && !(await hadIt.evaluate((el) => el === document.activeElement));
    i++
  )
    await page.keyboard.press('Tab');
  await expect(hadIt).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText('Today’s question, done')).toBeVisible();
});

test('an address that leads nowhere: the site says so in its own look and offers a way on', async ({
  page,
}) => {
  test.info().annotations.push({ type: 'console-error', description: '404' });
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'There is no page at this address',
  );
  await expect(page.locator('[data-slot="topbar"]')).toBeVisible();
  await page.getByRole('link', { name: 'See every answer' }).click();
  await expect(page).toHaveURL(/\/facts\/$/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const p of PAGES.filter(
    (p) =>
      ['home', 'facts', 'daily', 'how-we-check'].includes(p.name) ||
      p.name.startsWith('answer-'),
  )) {
    test(`${p.name}: the page is there to read`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator('h1')).toBeVisible();
      // Nothing waits for a script to arrive: no block is left hidden.
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main *')]
          // A closed region (inert) is hidden on purpose; its no-script twin shows the same text.
          .filter(
            (el) =>
              !el.closest('[inert]') &&
              el.innerText?.trim() &&
              getComputedStyle(el).opacity === '0',
          )
          .map((el) => el.innerText.trim().slice(0, 40)),
      );
      expect(hidden).toEqual([]);
    });
  }
  test('daily: the answer can still be opened', async ({ page }) => {
    await page.goto('/daily/');
    const fallback = page.locator('[data-slot="recall-card-fallback"]');
    await expect(fallback).toBeVisible();
    await fallback.locator('summary').click();
    await expect(fallback).toHaveAttribute('open', '');
  });
});

test('reduced motion: nothing keeps moving once the page is still', async ({
  page,
}) => {
  for (const p of PAGES.filter((p) => p.name !== 'not-found')) {
    await page.goto(p.path);
    await settle(page);
    const moving = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === 'running' &&
            a.effect?.getComputedTiming().iterations === Infinity,
        )
        .map(
          (a) =>
            (a.effect as KeyframeEffect | null)?.target?.getAttribute(
              'data-slot',
            ) ?? 'unknown',
        ),
    );
    expect(moving, `${p.path} keeps moving`).toEqual([]);
  }
});
