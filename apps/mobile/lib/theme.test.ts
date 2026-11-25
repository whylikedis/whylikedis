import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditPalette } from '../interlace/native/contrast.ts';
import { THEME_PALETTES } from '../interlace/native/tokens.generated.ts';
import { colors } from './brand-colors.ts';

// The same check Interlace runs on its own themes, on ours: every text pair at 4.5:1 (AA), every
// control boundary at 3:1, in both schemes.
for (const scheme of ['light', 'dark'] as const) {
  test(`the brand palette clears the WCAG floors in ${scheme}`, () => {
    const palette = { ...THEME_PALETTES.interlace[scheme], ...colors[scheme] };
    assert.deepEqual(auditPalette(palette), []);
  });
}
