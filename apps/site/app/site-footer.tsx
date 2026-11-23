import Link from 'next/link';
import { Footer } from '@/components/ui/patterns/footer';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';

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
        <Stack gap="xs">
          <Typography variant="h5">WhyLikeDIs</Typography>
          <Typography variant="ui" tone="muted">
            Clear answers about Israel, each with sources you can check.
          </Typography>
        </Stack>
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
