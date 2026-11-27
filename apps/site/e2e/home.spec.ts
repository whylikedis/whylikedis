// The home page's first impression and the way in to a session: the headline is readable at the
// first paint, the bar solid under scrolled content, a session is bookable from every page, the
// search and the counted numbers read once to a screen reader, and what a crawler may see.
import { expect, settle, test } from './fixtures';

test.describe('the headline is there at the first paint', () => {
  // Motion on: the old headline revealed itself word by word, starting hidden.
  test.use({ reducedMotion: 'no-preference' });

  test('h1 is visible, fully opaque, and has no hidden word, before anything has settled', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const seen = await h1.evaluate((el) => {
      const chain: number[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        chain.push(Number(getComputedStyle(n).opacity));
      }
      const hidden = [...el.querySelectorAll('*')].filter((c) => {
        const s = getComputedStyle(c);
        return Number(s.opacity) < 1 || s.visibility === 'hidden';
      }).length;
      return { chain, hidden, text: el.textContent?.trim() ?? '' };
    });
    expect(seen.text).not.toBe('');
    expect(seen.chain.every((o) => o === 1)).toBe(true);
    expect(seen.hidden).toBe(0);
  });
});

test('a session is bookable from the bar on every page, and from the home page', async ({
  page,
}) => {
  for (const path of ['/', '/facts/', '/how-we-check/']) {
    await page.goto(path);
    await settle(page);
    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { name: 'Book a session' })
        .first(),
    ).toHaveAttribute('href', '/sessions/');
  }
  await page.goto('/');
  await settle(page);
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Book a session' }),
  ).toHaveAttribute('href', '/sessions/');
});

test('the home title says what the site is', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title).toContain('Clear answers about Israel');
  expect(title.length).toBeGreaterThan('WhyLikeDIs'.length + 20);
});

test('the bar is solid once the page scrolls under it', async ({ page }) => {
  await page.goto('/facts/');
  await settle(page);
  await page.mouse.wheel(0, 900);
  const bar = page.locator('[data-slot="topbar"]');
  await expect(bar).toHaveAttribute('data-scrolled', '');
  // The surface fades in, so read it once it has settled.
  await expect
    .poll(() =>
      bar.evaluate((el) => {
        const c = getComputedStyle(el).backgroundColor;
        const m = c.match(/[\d.]+/g)?.map(Number) ?? [];
        return m.length > 3 ? m[m.length - 1] : m.length === 3 ? 1 : 0;
      }),
    )
    .toBe(1);
});

test('the search box has a name, and each counted number is read once', async ({
  page,
}) => {
  await page.goto('/');
  await settle(page);
  await expect(
    page.getByRole('combobox', { name: 'What did your child hear?' }).first(),
  ).toBeVisible();
  const counts = page.locator('[data-slot="count-up"]');
  expect(await counts.count()).toBeGreaterThan(0);
  for (const el of await counts.all()) {
    const exposed = await el.evaluate(
      (root) =>
        [...root.children].filter(
          (c) => c.getAttribute('aria-hidden') !== 'true' && c.textContent,
        ).length,
    );
    expect(exposed, 'one label for a screen reader, the digits hidden').toBe(1);
  }
});

test('the reading control and its steps are 44px targets', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  const trigger = page.getByRole('button', { name: 'Reading settings' });
  const box = await trigger.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await trigger.click();
  // The popover opens with an animation, even at 0.01ms under reduced motion; measured in the same
  // tick the buttons are still scaled (41.8px wide), so wait until it has finished opening.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  for (const name of ['Smaller text', 'Larger text']) {
    const b = await page.getByRole('button', { name }).boundingBox();
    expect(b!.width, `${name} wide`).toBeGreaterThanOrEqual(44);
    expect(b!.height, `${name} high`).toBeGreaterThanOrEqual(44);
  }
});

test('robots.txt and the sitemap leave out what is held back or private', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  for (const path of ['/election-map/', '/account/', '/sign-in/', '/play/']) {
    expect(robots).toContain(`Disallow: ${path}`);
  }
  expect(robots).toContain('Sitemap: https://www.whylikedis.fyi/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('https://www.whylikedis.fyi/sessions/');
  expect(sitemap).toContain('https://www.whylikedis.fyi/facts/');
  for (const path of ['election-map', '/account/', '/sign-in/', '/play/']) {
    expect(sitemap).not.toContain(path);
  }
});
