'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/ui/patterns/topbar';
import { Logo } from './logo';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/facts/', label: 'Answers' },
  { href: '/questions/', label: 'Questions we tested' },
  { href: '/election-map/', label: 'Election map' },
  { href: '/method/', label: 'How we check' },
  { href: '/open/', label: 'Open questions' },
];

export function Nav() {
  const here = usePathname().replace(/\/?$/, '/');
  return (
    <Topbar
      containerSize="content"
      logo={
        <Link href="/" aria-label="WhyLikeDIs home">
          <Logo />
        </Link>
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
