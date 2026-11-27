// A group that wants to talk an answer through finds the sessions page from the answer itself, and
// the booking form names the groups the sessions are for.
import { expect, settle, test } from './fixtures';

test('the answer page ends with a line to the sessions page', async ({
  page,
}) => {
  await page.goto('/answers/era7-slogan-history-and-meanings/');
  await settle(page);
  const link = page
    .getByRole('main')
    .getByRole('link', { name: 'See sessions' });
  await expect(link).toHaveAttribute('href', '/sessions/');
  await expect(link.locator('..')).toContainText(
    'Want to talk this through with your group?',
  );
});

test("today's question shows the same line once the answer is open", async ({
  page,
}) => {
  await page.goto('/daily/');
  await settle(page);
  // Closed, the answer is folded; the line under it opens with it.
  const reveal = page.locator('[data-slot="recall-card-reveal"]');
  await expect(reveal).toHaveAttribute('aria-expanded', 'false');
  await reveal.click();
  const link = page.getByRole('link', { name: 'See sessions' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/sessions/');
});

test('the booking form lists church and company among the groups', async ({
  page,
}) => {
  await page.goto('/sessions/');
  await settle(page);
  const group = page.getByRole('radio', { name: /A group/ });
  await expect(group).toBeVisible();
  const text = await page.getByRole('main').innerText();
  for (const word of [
    'school',
    'synagogue',
    'church',
    'company',
    'youth group',
  ]) {
    expect(text).toContain(word);
  }
});
