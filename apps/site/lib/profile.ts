import type { User } from '@supabase/supabase-js';

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

/** A name to greet someone by: the first name, else the start of the email. */
export function displayName(p: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null, user?: User | null) {
  const first = p?.first_name?.trim();
  if (first) return first;
  const email = p?.email ?? user?.email;
  return email ? email.split('@')[0] : 'Your account';
}

/** Up to two letters for an avatar with no photo. */
export function initials(p: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null) {
  const s = [p?.first_name, p?.last_name]
    .map((x) => x?.trim()?.[0])
    .filter(Boolean)
    .join('');
  return (s || p?.email?.[0] || '?').toUpperCase();
}
