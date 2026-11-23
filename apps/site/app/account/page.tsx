import type { Metadata } from 'next';
import { Section } from '@/components/ui/section';
import { Typography } from '@/components/ui/typography';
import { AccountView } from './account-view';

export const metadata: Metadata = { title: 'Your account', alternates: { canonical: '/account/' } };

export default function Account() {
  return (
    <Section container="prose" spacing="tight">
      <Typography as="h1" variant="h2">
        Your account
      </Typography>
      <AccountView />
    </Section>
  );
}
