'use client';

import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { displayName, initials, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase/client';
import { AUTH_ENABLED } from '@/lib/supabase/config';

// The right end of the top bar: "Sign in" for a visitor, their photo and a menu once signed in.
// Pages stay static: the session is read here, in the browser.
export function AccountButton() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const here = usePathname();

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const auth = supabase().auth;
    auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return setProfile(null);
    supabase()
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (!AUTH_ENABLED) return null;
  // Until the browser has read the session, keep the room the answer will take: an invisible copy of
  // the Sign in button. Nothing is announced or focusable, and the bar does not move when it resolves.
  if (user === undefined)
    return (
      <span
        aria-hidden
        inert
        className={`${buttonVariants({ variant: 'outline', size: 'sm' })} invisible`}
      >
        Sign in
      </span>
    );

  if (!user) {
    const next =
      here === '/sign-in/' ? '' : `?next=${encodeURIComponent(here)}`;
    return (
      <Link
        href={`/sign-in/${next}`}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Sign in
      </Link>
    );
  }

  const p = profile ?? {
    first_name: null,
    last_name: null,
    email: user.email ?? null,
    avatar_url: null,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName(p, user)}`}
        className="focus-visible:ring-ring/60 rounded-full outline-none focus-visible:ring-[3px]"
      >
        <Avatar className="size-9">
          {p.avatar_url ? (
            <AvatarImage
              src={p.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : null}
          <AvatarFallback>{initials(p)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <span className="block font-medium">{displayName(p, user)}</span>
          {p.email ? (
            <span className="text-muted-foreground block text-xs font-normal">
              {p.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account/" />}>
          Your account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await supabase().auth.signOut();
            router.refresh();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
