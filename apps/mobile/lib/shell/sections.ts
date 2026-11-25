// The app is a shell of sections, and this list is its table of contents. Games are one section
// among the things WhyLikeDIs does (answers, updates, later sessions and more): a new section is a
// route file under app/(tabs)/ plus one entry here, and switching one off hides its tab without
// deleting anything. The tab bar is built from this list, in this order.
import type { SFSymbol } from 'sf-symbols-typescript';

export type SectionId = 'play' | 'answers' | 'updates';

export type Section = {
  id: SectionId;
  // The file under app/(tabs)/ that renders it ("index" is the first tab).
  route: string;
  label: string;
  // SF Symbols on iOS, Material Symbols on Android.
  icon: { sf: SFSymbol; sfSelected: SFSymbol; md: string };
  enabled: boolean;
};

export const SECTIONS: readonly Section[] = [
  {
    id: 'play',
    route: 'index',
    label: 'Play',
    icon: { sf: 'gamecontroller', sfSelected: 'gamecontroller.fill', md: 'sports_esports' },
    enabled: true,
  },
  {
    id: 'answers',
    route: 'answers',
    label: 'Answers',
    icon: { sf: 'book', sfSelected: 'book.fill', md: 'menu_book' },
    enabled: true,
  },
  {
    id: 'updates',
    route: 'updates',
    label: 'Updates',
    icon: { sf: 'newspaper', sfSelected: 'newspaper.fill', md: 'newspaper' },
    enabled: true,
  },
];

// The checks a test holds the list to: unique ids and routes, and at least one section on.
export function sectionProblems(sections: readonly Section[]): string[] {
  const problems: string[] = [];
  const dup = (key: 'id' | 'route') =>
    sections
      .map((s) => s[key])
      .filter((v, i, all) => all.indexOf(v) !== i)
      .forEach((v) => problems.push(`duplicate ${key}: ${v}`));
  dup('id');
  dup('route');
  if (!sections.some((s) => s.enabled)) problems.push('no section is enabled');
  if (sections[0]?.route !== 'index') problems.push('the first section must be the index route');
  return problems;
}
