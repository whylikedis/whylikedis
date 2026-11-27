// Accounts are off until both public values are set, so the site builds and runs without them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** The ways in, as the sign-in page shows them, and the Supabase provider each one uses. */
export const PROVIDERS = {
  google: { supabase: 'google', scopes: undefined },
  apple: { supabase: 'apple', scopes: undefined },
  facebook: { supabase: 'facebook', scopes: 'email public_profile' },
  x: { supabase: 'x', scopes: 'users.read tweet.read users.email' },
  tiktok: { supabase: 'custom:tiktok', scopes: undefined },
  microsoft: { supabase: 'azure', scopes: 'email openid profile' },
  linkedin: { supabase: 'linkedin_oidc', scopes: undefined },
  github: { supabase: 'github', scopes: 'read:user user:email' },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

const isProvider = (id: string): id is ProviderId => id in PROVIDERS;

/**
 * Which buttons to show, in order: only providers switched on in Supabase, listed in
 * NEXT_PUBLIC_AUTH_PROVIDERS (for example "google,apple,facebook,x"). A button for a provider
 * that is not set up would only lead to an error page.
 */
export const ENABLED_PROVIDERS: ProviderId[] = (
  process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? 'google'
)
  .split(',')
  .map((s) => s.trim())
  .filter(isProvider);

/** The Supabase provider name back to ours, for the identities a user already has. */
export function providerFromSupabase(
  name: string,
): ProviderId | 'email' | undefined {
  if (name === 'email') return 'email';
  return (Object.keys(PROVIDERS) as ProviderId[]).find(
    (id) => PROVIDERS[id].supabase === name,
  );
}
