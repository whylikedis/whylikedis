// Local until Interlace's Topbar has a mobile menu and marks the current page.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './logo';

const NAV = [
  ['/', 'Home'],
  ['/facts/', 'Answers'],
  ['/questions/', 'Questions we tested'],
  ['/election-map/', 'Election map'],
  ['/method/', 'How we check'],
  ['/open/', 'Open questions'],
];

export function Nav() {
  const here = usePathname().replace(/\/?$/, '/');
  return (
    <nav className="sitenav" aria-label="Site">
      <ul>
        <li>
          <Link href="/" aria-label="WhyLikeDIs home">
            <Logo />
          </Link>
        </li>
        {NAV.map(([href, label]) => (
          <li key={href}>
            <Link href={href} aria-current={href === here ? 'page' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
