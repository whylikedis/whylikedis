import Link from 'next/link';
import { Footer } from '@/components/ui/patterns/footer';

const GROUPS = [
  {
    title: 'Answers',
    links: [
      { href: '/facts/', label: 'All answers' },
      { href: '/questions/', label: 'Questions we tested' },
      { href: '/election-map/', label: 'Election map' },
    ],
  },
  {
    title: 'About us',
    links: [
      { href: '/#where-we-stand', label: 'Where we stand' },
      { href: '/method/', label: 'How we check' },
      { href: '/open/', label: 'Open questions' },
    ],
  },
];

export function SiteFooter() {
  return (
    <Footer
      containerSize="content"
      brand={
        <>
          <p className="font-semibold">WhyLikeDIs</p>
          <p className="text-muted-foreground mt-2 max-w-xs text-sm">
            Clear answers about Israel, each with sources you can check.
          </p>
        </>
      }
      groups={GROUPS}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
