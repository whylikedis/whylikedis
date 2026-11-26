// Every page, in every reading condition: it loads, it has one heading to start from, axe finds
// nothing, it never scrolls sideways, Hebrew and Arabic are marked as such, nothing paints over the
// header, and with motion on every block that arrives as you scroll does arrive.
import AxeBuilder from '@axe-core/playwright';
import {
  applyStorage,
  CONDITIONS,
  DESKTOP,
  inCondition,
  PHONE,
  ratchet,
} from './conditions';
import { expect, settle, test } from './fixtures';
import { appRoutes, PAGES, type Page } from './pages';

const AA = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

test('every page under app/ is checked', () => {
  const checked = new Set(PAGES.map((p) => p.route));
  const missing = appRoutes().filter((r) => !checked.has(r));
  expect(missing, 'add these routes to e2e/pages.ts').toEqual([]);
});

async function open(page: import('@playwright/test').Page, p: Page) {
  const res = await page.goto(p.path);
  expect(res?.status(), `${p.path} status`).toBe(
    p.name === 'not-found' ? 404 : 200,
  );
  await settle(page);
}

// The 404 page logs the 404 of its own document.
const notFoundNoise = (p: Page) => {
  if (p.name === 'not-found')
    test.info().annotations.push({ type: 'console-error', description: '404' });
};

test.describe('structure', () => {
  for (const p of PAGES) {
    test(`${p.name}: one h1, a title, a main landmark, a skip link to it`, async ({
      page,
    }) => {
      notFoundNoise(p);
      await open(page, p);
      if (p.name === 'account') {
        // Signed out, the account page sends the reader to sign in, and back here after.
        await expect(page).toHaveURL(
          /\/sign-in\/\?next=%2Faccount%2F|\/sign-in\/\?next=\/account\//,
        );
      }
      await expect(page.locator('h1')).toHaveCount(1);
      expect((await page.title()).trim()).not.toBe('');
      await expect(page.locator('main#main')).toHaveCount(1);
      await page.keyboard.press('Tab');
      const skip = page.locator(':focus');
      await expect(skip).toHaveAttribute('href', '#main');
      await expect(skip).toBeVisible();
    });
  }
});

for (const c of CONDITIONS) {
  test.describe(c.name, () => {
    inCondition(c);
    for (const p of PAGES) {
      test(`${p.name}: axe finds nothing, no sideways scroll`, async ({
        page,
      }) => {
        notFoundNoise(p);
        await applyStorage(page, c);
        await open(page, p);
        const axe = new AxeBuilder({ page }).withTags(AA);
        // The opt-in high-contrast setting promises AAA contrast.
        if (c.name === 'contrast-more')
          axe.withRules(['color-contrast-enhanced']);
        const { violations } = await axe.analyze();
        expect(
          violations.map(
            (v) =>
              `${v.id}: ${v.help} (${v.nodes
                .map((n) => n.target.join(' '))
                .slice(0, 3)
                .join(', ')})`,
          ),
        ).toEqual([]);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          'page scrolls sideways by this many pixels',
        ).toBeLessThanOrEqual(0);
      });
    }
  });
}

test.describe('Hebrew and Arabic', () => {
  for (const p of PAGES) {
    test(`${p.name}: every Hebrew or Arabic word is marked with its language and reads right to left`, async ({
      page,
    }) => {
      notFoundNoise(p);
      await open(page, p);
      const wrong = await page.evaluate(() => {
        const out: string[] = [];
        const walk = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        while (walk.nextNode()) {
          const node = walk.currentNode;
          const el = node.parentElement;
          if (!el || el.closest('script, style, noscript')) continue;
          const t = node.textContent ?? '';
          const want = /[֐-׿]/.test(t) ? 'he' : /[؀-ۿ]/.test(t) ? 'ar' : null;
          if (!want) continue;
          const lang = el.closest('[lang]')?.getAttribute('lang') ?? '';
          const dir = getComputedStyle(el).direction;
          if (!lang.startsWith(want) || dir !== 'rtl')
            out.push(`"${t.trim().slice(0, 24)}" lang=${lang} dir=${dir}`);
        }
        return out;
      });
      expect(wrong).toEqual([]);
    });
  }
});

test.describe('the header stays on top', () => {
  for (const viewport of [PHONE, DESKTOP]) {
    test.describe(`${viewport.width}`, () => {
      test.use({ viewport });
      for (const p of PAGES) {
        test(`${p.name}: nothing paints over the header while scrolling`, async ({
          page,
        }) => {
          ratchet(`header-on-top ${p.name} ${viewport.width}`);
          notFoundNoise(p);
          await open(page, p);
          const over = await page.evaluate(async () => {
            const header = document.querySelector('[data-slot="topbar"]');
            if (!header) return ['no header'];
            const out = new Set<string>();
            const frame = () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              );
            const end = document.documentElement.scrollHeight - innerHeight;
            for (let y = 0; y <= end + 120; y += 120) {
              window.scrollTo(0, Math.min(y, end));
              await frame();
              const r = header.getBoundingClientRect();
              if (r.bottom <= 0) continue; // a header that scrolls away is not covered
              for (const fx of [0.03, 0.25, 0.5, 0.75, 0.97])
                for (const fy of [0.25, 0.5, 0.75]) {
                  const el = document.elementFromPoint(
                    r.left + r.width * fx,
                    Math.max(0, r.top) + r.height * fy,
                  );
                  if (
                    el &&
                    !header.contains(el) &&
                    !el.closest('[data-slot="topbar-menu"], [role="dialog"]')
                  )
                    out.add(
                      `${el.tagName.toLowerCase()}[data-slot=${el.closest('[data-slot]')?.getAttribute('data-slot')}] at scroll ${Math.min(y, end)}`,
                    );
                }
            }
            return [...out].slice(0, 5);
          });
          expect(over).toEqual([]);
        });
      }
    });
  }
});

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference', viewport: PHONE });
  for (const p of PAGES) {
    test(`${p.name}: every block that arrives on scroll has arrived`, async ({
      page,
    }) => {
      notFoundNoise(p);
      await open(page, p);
      await page.evaluate(async () => {
        const end = document.documentElement.scrollHeight;
        // Half a screen at a time, two frames each: a reader scrolling briskly.
        const frame = () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          );
        for (let y = 0; y <= end; y += innerHeight / 2) {
          window.scrollTo(0, y);
          await frame();
        }
      });
      // Each arrival plays on the document's own timeline, well under a second.
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              [
                ...document.querySelectorAll<HTMLElement>(
                  '[data-slot="reveal"]',
                ),
              ]
                .filter((el) => Number(getComputedStyle(el).opacity) < 0.99)
                .map(
                  (el) =>
                    `${(el.textContent ?? '').trim().slice(0, 40)} revealed=${el.dataset.revealed} anims=${el.getAnimations().map((a) => a.playState)}`,
                ),
            ),
          { timeout: 5000 },
        )
        .toEqual([]);
    });
  }
});
