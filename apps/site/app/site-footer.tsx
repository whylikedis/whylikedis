import Link from 'next/link';
import { Footer } from '@/components/ui/patterns/footer';
import { Typography } from '@/components/ui/typography';
import { ANALYTICS_NOTICE, ANALYTICS_ON } from '@/lib/analytics';

// Named for the anonymous click counts: nav_daily, footer_how_we_check, nav_home.
const intentOf = (where: string, href: string) =>
  `${where}_${href.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '_') || 'home'}`;

const GROUPS = [
  {
    title: 'Answers',
    links: [
      { href: '/facts/', label: 'All answers' },
      { href: '/questions/', label: 'Questions we tested' },
      { href: '/daily/', label: 'Daily question' },
      { href: '/updates/', label: 'What’s new' },
    ],
  },
  {
    title: 'About us',
    links: [
      { href: '/#where-we-stand', label: 'Where we stand' },
      { href: '/how-we-check/', label: 'How we check' },
      { href: '/open/', label: 'Open questions' },
    ],
  },
];

export function SiteFooter() {
  return (
    <Footer
      containerSize="wide"
      // The name looks like a heading but is not one: a heading here sat an h5 under
      // the page's h2s and broke the outline on every page (axe heading-order).
      brand={
        <Typography as="p" variant="h5">
          WhyLikeDIs
        </Typography>
      }
      tagline="Clear answers about Israel, each with sources you can check."
      groups={GROUPS}
      // Shown only where analytics is on. The wording is a public claim: approved by the owners.
      copyright={ANALYTICS_ON ? ANALYTICS_NOTICE : undefined}
      renderLink={({ href, className, children }) => (
        <Link
          href={href}
          className={className}
          data-intent={intentOf('footer', href)}
        >
          {children}
        </Link>
      )}
    />
  );
}
