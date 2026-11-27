import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  auditPalette,
  contrastRatio,
} from '../../interlace/native/contrast.ts';
import { createTheme } from '../../interlace/native/theme-model.ts';
import { colors, moreContrastBrand } from '../brand-colors.ts';
import { loadReading, READING_KEY, saveReading } from './store.ts';

const brand = {
  light: colors.light,
  dark: colors.dark,
  moreContrast: moreContrastBrand,
};

for (const scheme of ['light', 'dark'] as const) {
  test(`More contrast reaches AAA in ${scheme}, and the flag blue is still the accent`, () => {
    const theme = createTheme({ scheme, overrides: brand, moreContrast: true });
    assert.deepEqual(auditPalette(theme.colors, 'AAA'), []);
    assert.equal(theme.colors.primary, colors[scheme].primary);
    // Text on every tinted surface, and the blue on them, not only on the page.
    for (const surface of [
      'muted',
      'accent',
      'secondary',
      'primarySubtle',
    ] as const) {
      assert.ok(
        contrastRatio(theme.colors.foreground, theme.colors[surface]) >= 7,
        surface,
      );
      assert.ok(
        contrastRatio(theme.colors.primary, theme.colors[surface]) >= 7,
        surface,
      );
    }
    for (const state of ['primary', 'primaryHover', 'primaryActive'] as const)
      assert.ok(
        contrastRatio(theme.colors.primaryForeground, theme.colors[state]) >= 7,
        state,
      );
  });
}

test('the brand theme hands More contrast its own primary', () => {
  const source = readFileSync(new URL('../theme.ts', import.meta.url), 'utf8');
  assert.match(source, /moreContrast: moreContrastBrand/);
});

test('a larger text size grows the type, and the touch targets stay as they are', () => {
  const normal = createTheme({ scheme: 'light', overrides: brand });
  const big = createTheme({
    scheme: 'light',
    overrides: brand,
    textSize: '2xl',
  });
  assert.equal(
    big.type.body.fontSize,
    Math.round(normal.type.body.fontSize * 1.5),
  );
  assert.ok(big.type.caption.lineHeight > normal.type.caption.lineHeight);
  assert.equal(big.control.sm, normal.control.sm);
  assert.equal(big.maxFontScale, normal.maxFontScale);
});

function fake(initial: string | null, failOn?: 'get' | 'set') {
  const data = new Map<string, string>(
    initial === null ? [] : [[READING_KEY, initial]],
  );
  return {
    data,
    getItem: async (k: string) => {
      if (failOn === 'get') throw new Error('disk');
      return data.get(k) ?? null;
    },
    setItem: async (k: string, v: string) => {
      if (failOn === 'set') throw new Error('full');
      data.set(k, v);
    },
  };
}

test('the choice survives a restart', async () => {
  const s = fake(null);
  await saveReading(s, { textSize: 'xl', contrast: 'more' }, () =>
    assert.fail(),
  );
  assert.deepEqual(await loadReading(s, () => assert.fail()), {
    textSize: 'xl',
    contrast: 'more',
  });
});

test('a missing, corrupt or unreadable choice opens the app at the default', async () => {
  const seen: string[] = [];
  const onError = (_e: unknown, where: string) => seen.push(where);
  const dflt = { textSize: 'default', contrast: 'system' };
  assert.deepEqual(await loadReading(fake(null), onError), dflt);
  assert.deepEqual(await loadReading(fake('{{nope'), onError), dflt);
  assert.deepEqual(
    await loadReading(fake('{"textSize":"huge"}'), onError),
    dflt,
  );
  assert.deepEqual(await loadReading(fake(null, 'get'), onError), dflt);
  assert.deepEqual(seen, ['reading: load']);
});

test('a failed save is reported and never thrown', async () => {
  const seen: string[] = [];
  await saveReading(
    fake(null, 'set'),
    { textSize: 'lg', contrast: 'normal' },
    (_e, w) => seen.push(w),
  );
  assert.deepEqual(seen, ['reading: save']);
});
