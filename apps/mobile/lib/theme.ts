// The WhyLikeDIs brand on Interlace native: the same values as apps/site/app/whylikedis-theme.css
// (flag blue as the one accent on warm paper and ink), passed as token overrides. Interlace's own
// components are never edited. lib/theme.test.ts holds every pair to the WCAG floors.
import { Platform } from 'react-native';
import type { ThemeOverrides } from '../interlace/native/theme-model';
import { colors } from './brand-colors.ts';

export const brand: ThemeOverrides = {
  light: colors.light,
  dark: colors.dark,
  radius: 10,
  // A serif for headlines, as on the site; the platform's own, so there is no font to load at start.
  fonts: { display: Platform.select({ ios: 'Georgia', android: 'serif' }) },
};
