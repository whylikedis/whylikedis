'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
