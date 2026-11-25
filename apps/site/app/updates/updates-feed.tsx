'use client';
// The feed with "New since your last visit": the moment of the last visit is kept in this browser
// only, read after the page renders (so the server HTML is the same for everyone) and moved on
// once the reader has seen the list.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UpdateFeed } from '@/components/ui/patterns/update-feed';
import { countNewSince } from '@/components/ui/patterns/update-feed-model';
import { capture } from '@/lib/analytics';

export type Update = {
  id: string;
  date: string;
  kind: string;
  title: string;
  description: string;
  href: string;
};

export const LAST_SEEN_KEY = 'wld.updates.lastSeen';

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function UpdatesFeed({ updates }: { updates: Update[] }) {
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    const last = readLastSeen();
    setSince(last);
    capture('updates_viewed', {
      total: updates.length,
      new_count: countNewSince(updates, last),
      first_visit: last === null,
    });
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    } catch {
      // Storage off: every visit reads as the first, and nothing is marked new.
    }
  }, [updates]);

  return (
    <UpdateFeed
      entries={updates}
      since={since}
      locale="en-US"
      labels={{
        empty:
          'Nothing new yet. New answers appear here once a second reader has checked them.',
      }}
      renderLink={({ href, children, ...rest }) => (
        <Link
          href={href}
          {...rest}
          onClick={() => {
            const u = updates.find((x) => x.href === href);
            if (u)
              capture('update_opened', {
                kind: 'answer',
                id: u.id,
                was_new: since !== null && u.date > since,
              });
          }}
        >
          {children}
        </Link>
      )}
    />
  );
}
