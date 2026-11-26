// The reading conditions a page is checked in. Each one is how a real reader arrives: a phone, a
// dark room, the site's own text-size and contrast controls, a browser zoomed in.
import type { BrowserContextOptions, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from './fixtures';

export type Condition = {
  name: string;
  viewport: { width: number; height: number };
  colorScheme?: 'light' | 'dark';
  /** Browser zoom: CSS pixels shrink, device pixels stay. */
  deviceScaleFactor?: number;
  /** The site's reading controls, as the reader would have saved them. */
  storage?: Record<string, string>;
};

export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 820, height: 1180 };
export const DESKTOP = { width: 1440, height: 900 };

export const CONDITIONS: Condition[] = [
  { name: 'light-1440', viewport: DESKTOP, colorScheme: 'light' },
  { name: 'dark-390', viewport: PHONE, colorScheme: 'dark' },
  // 200% browser zoom on a 1280px-wide window.
  {
    name: 'zoom-200',
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  },
  // 400% zoom on 1280px: WCAG 1.4.10 reflow, no sideways scrolling at 320 CSS pixels.
  { name: 'reflow-320', viewport: { width: 320, height: 256 } },
  {
    name: 'text-150-390',
    viewport: PHONE,
    storage: { 'interlace-text-size': '2xl' },
  },
  {
    name: 'contrast-more',
    viewport: PHONE,
    storage: { 'interlace-contrast': 'more' },
  },
];

/** Use this condition for every test in the current describe block. */
export function inCondition(c: Condition) {
  const opts: BrowserContextOptions = { viewport: c.viewport };
  if (c.colorScheme) opts.colorScheme = c.colorScheme;
  if (c.deviceScaleFactor) opts.deviceScaleFactor = c.deviceScaleFactor;
  test.use(opts);
}

/** Save the reader's choices before the page's first script runs. */
export async function applyStorage(page: Page, c: Pick<Condition, 'storage'>) {
  if (!c.storage) return;
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) window.localStorage.setItem(k, v);
  }, c.storage);
}

const { known } = JSON.parse(
  readFileSync(join(__dirname, 'known.json'), 'utf8'),
) as {
  known: string[];
};

/** A failure listed in known.json is expected; once it passes, the listing itself fails. */
export function ratchet(id: string) {
  test.fail(
    known.includes(id),
    `known failure "${id}" (e2e/known.json): delete the line if fixed`,
  );
}
