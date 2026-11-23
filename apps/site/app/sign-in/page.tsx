import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Section } from '@/components/ui/section';
import { Typography } from '@/components/ui/typography';
import { SignInPanel } from './sign-in-panel';

export const metadata: Metadata = { title: 'Sign in', alternates: { canonical: '/sign-in/' } };

export default function SignIn() {
  return (
    <Section container="prose" spacing="tight">
      <div className="mx-auto flex w-full max-w-96 flex-col gap-6">
        <div>
          <Typography as="h1" variant="h2">
            Sign in
          </Typography>
          <Typography variant="body" tone="muted" className="mt-2">
            New here? The same buttons make your account.
          </Typography>
        </div>
        {/* The panel reads ?next= and ?error= from the address, so it renders on the client. */}
        <Suspense>
          <SignInPanel />
        </Suspense>
      </div>
    </Section>
  );
}
