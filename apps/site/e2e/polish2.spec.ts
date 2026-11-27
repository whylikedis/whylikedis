// Round two of the polish: what a thumb and a narrow screen meet on the sessions form, an answer
// page and the host screen. Small controls have a 44px hit area (the box is small, the pointer
// target is not), the booking radios stay beside their labels, and a room of one says "1 player".
import { expect, settle, test } from './fixtures';
import { PHONE } from './conditions';

test.use({ viewport: PHONE });

/** Is the point `dy` pixels above/below the centre of `selector`'s first match still that control? */
async function hits(
  page: import('@playwright/test').Page,
  selector: string,
  dy: number,
) {
  return page.evaluate(
    ([sel, offset]) => {
      const el = document.querySelector(sel as string) as HTMLElement | null;
      if (!el) return 'missing';
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2 + (offset as number),
      );
      return hit && (hit === el || el.contains(hit))
        ? 'yes'
        : `no (${hit?.tagName.toLowerCase()})`;
    },
    [selector, dy] as const,
  );
}

test('a source chip can be hit 20px above and below its 18px box', async ({
  page,
}) => {
  await page.goto('/answers/era7-slogan-history-and-meanings/');
  await settle(page);
  const sel = '[data-slot="citation-trigger"]';
  expect(await hits(page, sel, 0)).toBe('yes');
  expect(await hits(page, sel, -20)).toBe('yes');
  expect(await hits(page, sel, 20)).toBe('yes');
});

test('the breadcrumb link has a 44px target', async ({ page }) => {
  await page.goto('/answers/era7-slogan-history-and-meanings/');
  await settle(page);
  const sel = '[data-slot="breadcrumb-link"]';
  expect(await hits(page, sel, -20)).toBe('yes');
  expect(await hits(page, sel, 20)).toBe('yes');
});

test('Sign in has a 44px target', async ({ page }) => {
  await page.goto('/daily/');
  await settle(page);
  const sel = '[data-slot="topbar"] a[href*="sign-in"]';
  expect(await hits(page, sel, -21)).toBe('yes');
  expect(await hits(page, sel, 21)).toBe('yes');
});

test('on the sessions form each radio sits beside its label, at the narrowest width too', async ({
  page,
}) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/sessions/');
    await settle(page);
    for (const radio of await page.getByRole('radio').all()) {
      const r = await radio.boundingBox();
      const label = await radio.evaluate((el) => {
        const text = el
          .closest('label')
          ?.querySelector('[data-slot="typography"]');
        const b = text?.getBoundingClientRect();
        return b ? { top: b.top, left: b.left } : null;
      });
      // The circle's top edge is within a line of the label's first line, and it is to its start side.
      expect(label, `a label beside the radio at ${width}px`).not.toBeNull();
      expect(
        Math.abs(r!.y - label!.top),
        `radio and label on one line at ${width}px`,
      ).toBeLessThan(24);
      expect(r!.x).toBeLessThan(label!.left);
    }
  }
});

test('a host with a room of one is told it needs 1 player, not 1 players', async ({
  page,
}) => {
  await page.goto('/play/host/');
  await settle(page);
  const text = await page
    .locator('[data-slot="room-host-controls"], main')
    .first()
    .innerText();
  expect(text).toMatch(/Needs 1 player to start/);
  expect(text).not.toMatch(/Needs 1 players/);
});
