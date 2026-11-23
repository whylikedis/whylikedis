'use client';

import type { User, UserIdentity } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignInMethods, type SignInMethod } from '@/components/ui/patterns/sign-in-methods';
import { initials, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase/client';
import {
  AUTH_ENABLED,
  ENABLED_PROVIDERS,
  PROVIDERS,
  providerFromSupabase,
  type ProviderId,
} from '@/lib/supabase/config';

/** What each identity is linked to, as the provider reported it. */
function identityDetail(i: UserIdentity) {
  const d = i.identity_data ?? {};
  return (d.email as string) ?? (d.user_name ? `@${d.user_name}` : undefined) ?? (d.preferred_username as string);
}

export function AccountView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const ids = { first: useId(), last: useId(), email: useId() };

  const load = useCallback(async () => {
    const auth = supabase().auth;
    const { data } = await auth.getUser();
    if (!data.user) {
      router.replace('/sign-in/?next=/account/');
      return;
    }
    setUser(data.user);
    const [{ data: p }, { data: idents }] = await Promise.all([
      supabase().from('profiles').select('id, first_name, last_name, email, avatar_url').eq('id', data.user.id).maybeSingle(),
      auth.getUserIdentities(),
    ]);
    setProfile(p);
    setIdentities(idents?.identities ?? []);
  }, [router]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  if (!AUTH_ENABLED) return <p className="text-muted-foreground mt-4">Accounts are not open yet.</p>;
  if (!user) return <p className="text-muted-foreground mt-4" aria-busy="true">Loading your account…</p>;

  const p: Profile = profile ?? { id: user.id, first_name: '', last_name: '', email: user.email ?? '', avatar_url: null };

  const save = async (form: FormData) => {
    setSaving(true);
    setStatus(undefined);
    setError(undefined);
    const first_name = String(form.get('first_name') ?? '').trim() || null;
    const last_name = String(form.get('last_name') ?? '').trim() || null;
    const email = String(form.get('email') ?? '').trim();
    const { error: e } = await supabase().from('profiles').update({ first_name, last_name }).eq('id', user.id);
    if (e) {
      setSaving(false);
      setError('Your details could not be saved. Please try again.');
      return;
    }
    let note = 'Saved.';
    if (email && email !== user.email) {
      // Supabase emails the new address a link; the change takes effect once it is pressed.
      const { error: ee } = await supabase().auth.updateUser({ email });
      note = ee ? 'Name saved. The new email address could not be used.' : `Saved. To change your email, press the link we sent to ${email}.`;
    }
    setSaving(false);
    setStatus(note);
    load();
  };

  // One row per way in: every identity they have, then every enabled provider they could add.
  const linked = new Set(identities.map((i) => providerFromSupabase(i.provider)));
  const methods: SignInMethod[] = [
    ...identities.flatMap((i) => {
      const id = providerFromSupabase(i.provider);
      return id ? [{ id, connected: true, detail: identityDetail(i) }] : [];
    }),
    ...ENABLED_PROVIDERS.filter((id) => !linked.has(id)).map((id) => ({ id, connected: false })),
  ];

  const connect = async (id: string) => {
    const { error: e } = await supabase().auth.linkIdentity({
      provider: PROVIDERS[id as ProviderId].supabase,
      options: { redirectTo: `${window.location.origin}/auth/callback/?next=/account/` },
    });
    if (e) setError('That account could not be connected. It may already belong to another account here.');
  };

  const disconnect = async (id: string) => {
    const identity = identities.find((i) => providerFromSupabase(i.provider) === id);
    if (!identity) return;
    const { error: e } = await supabase().auth.unlinkIdentity(identity);
    if (e) setError('That sign-in method could not be disconnected. Please try again.');
    else await load();
  };

  return (
    <div className="mt-6 flex flex-col gap-10">
      <section aria-labelledby="profile-h" className="flex flex-col gap-4">
        <h2 id="profile-h" className="font-heading text-h4 font-semibold">
          Your details
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 text-lg">
            {p.avatar_url ? <AvatarImage src={p.avatar_url} alt="Your photo" referrerPolicy="no-referrer" /> : null}
            <AvatarFallback>{initials(p)}</AvatarFallback>
          </Avatar>
          <p className="text-muted-foreground text-sm">
            Your photo comes from the account you signed in with.
          </p>
        </div>
        <form action={save} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.first} className="text-sm font-medium">First name</label>
              <Input id={ids.first} name="first_name" autoComplete="given-name" defaultValue={p.first_name ?? ''} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.last} className="text-sm font-medium">Last name</label>
              <Input id={ids.last} name="last_name" autoComplete="family-name" defaultValue={p.last_name ?? ''} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.email} className="text-sm font-medium">Email</label>
            <Input
              id={ids.email}
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={user.email ?? ''}
              required={!user.email}
            />
            {!user.email ? (
              <p className="text-muted-foreground text-sm">
                The account you signed in with did not share an email. Add one so we can reach you.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving}>Save</Button>
            <p role="status" className="text-muted-foreground text-sm">{status}</p>
          </div>
        </form>
      </section>

      <section aria-labelledby="methods-h" className="flex flex-col gap-4">
        <div>
          <h2 id="methods-h" className="font-heading text-h4 font-semibold">
            Ways to sign in
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect more than one, so you can still get in if you lose one.
            {user.email ? ` You can always sign in with a code sent to ${user.email}.` : null}
          </p>
        </div>
        <SignInMethods methods={methods} onConnect={connect} onDisconnect={disconnect} />
      </section>

      {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}

      <div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase().auth.signOut();
            router.replace('/');
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
