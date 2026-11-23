'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/ui/patterns/topbar';
import { Wordmark } from '@/components/ui/patterns/wordmark';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/facts/', label: 'Answers' },
  { href: '/questions/', label: 'Questions we tested' },
  { href: '/election-map/', label: 'Election map' },
  { href: '/method/', label: 'How we check' },
  { href: '/open/', label: 'Open questions' },
];

// The mark is an Israeli street sign: the name in Hebrew, Arabic and English, the way the
// country's own signs write a place name.
export function Nav() {
  const here = usePathname().replace(/\/?$/, '/');
  return (
    <Topbar
      containerSize="wide"
      logo={
        <Wordmark label="WhyLikeDIs, home" href="/">
          <Wordmark.Line lang="he" dir="rtl">
            למה ככה
          </Wordmark.Line>
          <Wordmark.Line lang="ar" dir="rtl">
            ليش هيك
          </Wordmark.Line>
          <Wordmark.Line lang="en">WHYLIKEDIS</Wordmark.Line>
        </Wordmark>
      }
      links={LINKS}
      currentHref={here}
      renderLink={({ href, className, children, ...rest }) => (
        <Link href={href} className={className} {...rest}>
          {children}
        </Link>
      )}
    />
  );
}
