// What a search engine and a link preview take from a page's head, which Lighthouse's SEO audits
// grade: at most one canonical address and exactly one description, on every page and after the
// redirects a page makes.
import { expect, settle, test } from './fixtures';
import { PAGES } from './pages';

for (const p of PAGES) {
  test(`${p.name}: one canonical address, at most, and a description`, async ({
    page,
  }) => {
    if (p.name === 'not-found')
      test.info().annotations.push({
        type: 'console-error',
        description: '404',
      });
    await page.goto(p.path);
    await settle(page);
    // The account page sends a signed-out reader to sign in: the head must then describe the page
    // they are on, not both.
    const canonicals = await page
      .locator('head link[rel="canonical"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(canonicals.length, `canonicals: ${canonicals}`).toBeLessThanOrEqual(
      1,
    );
    const descriptions = await page
      .locator('head meta[name="description"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    expect(descriptions.length).toBe(1);
    expect(descriptions[0]?.trim()).toBeTruthy();
  });
}
