'use client';
import type { CSSProperties } from 'react';

import { BookOpen, CircleHelp, FlaskConical, MapIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/ui/patterns/topbar';
import { Wordmark } from '@/components/ui/patterns/wordmark';
import { AccountButton } from '@/components/account-button';

// The site is a family of products. The record is the first: the answers and the data behind
// them, grouped in one menu with a line on each. How we check stays a plain link beside it.
const LINKS = [
  {
    label: 'The record',
    items: [
      {
        href: '/facts/',
        label: 'Answers',
        description: 'Every claim we answer, with the source for each fact.',
        icon: <BookOpen aria-hidden="true" />,
      },
      {
        href: '/election-map/',
        label: 'Election map',
        description:
          'Israel’s elections for the 25th and 26th Knesset, place by place.',
        icon: <MapIcon aria-hidden="true" />,
      },
      {
        href: '/questions/',
        label: 'Questions we tested',
        description: 'A hunch is a question until a source answers it.',
        icon: <FlaskConical aria-hidden="true" />,
      },
      {
        href: '/open/',
        label: 'Open questions',
        description: 'Answers whose rounds of review ended without a verdict.',
        icon: <CircleHelp aria-hidden="true" />,
      },
    ],
  },
  { href: '/method/', label: 'How we check' },
];

// The mark is an Israeli street sign: the name in Hebrew, Arabic and English, the way the
// country's own signs write a place name.
export function Nav() {
  const here = usePathname().replace(/\/?$/, '/');
  return (
    <Topbar
      containerSize="wide"
      collapseBelow="lg"
      edge="scroll"
      menuSide="full"
      logo={
        // The street sign keeps the sign face (Heebo), not the serif the headings use.
        <span style={{ '--font-heading': 'var(--font-sans)' } as CSSProperties}>
          <Wordmark label="WhyLikeDIs, home" href="/">
            <Wordmark.Line lang="he" dir="rtl">
              למה ככה
            </Wordmark.Line>
            <Wordmark.Line lang="ar" dir="rtl">
              ليش هيك
            </Wordmark.Line>
            <Wordmark.Line lang="en">WHYLIKEDIS</Wordmark.Line>
          </Wordmark>
        </span>
      }
      links={LINKS}
      currentHref={here}
      actions={<AccountButton />}
      renderLink={({ href, className, children, ...rest }) => (
        <Link href={href} className={className} {...rest}>
          {children}
        </Link>
      )}
    />
  );
}
