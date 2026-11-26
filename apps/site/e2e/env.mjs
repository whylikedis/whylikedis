// The build the browser checks test: accounts and analytics on, pointed at hosts that do not
// exist. `npm run e2e:build` builds with these, and e2e/fake-backend.ts answers both hosts, so
// nothing a check does ever leaves the machine.
export const SUPABASE = 'https://e2e-fake.supabase.co';
export const POSTHOG = 'https://e2e-fake.posthog.test';

export const E2E_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e',
  NEXT_PUBLIC_AUTH_PROVIDERS: 'google,apple',
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e',
  NEXT_PUBLIC_POSTHOG_HOST: POSTHOG,
};
