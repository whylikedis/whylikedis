'use client';

import * as React from 'react';
import { InterestSignal } from '@/components/ui/patterns/interest-signal';
import { supabaseLater } from '@/lib/supabase/lazy';
import { AUTH_ENABLED } from '@/lib/supabase/config';

// "I want more on this" under an answer. The press is remembered in this browser only, and,
// with Supabase configured, saved as an anonymous row (public.interest_signals: the answer's id
// and whether they want more, nothing about the person). The team reads the totals in Supabase.
const key = (id: string) => `wld:more:${id}`;

function read(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) === '1';
  } catch {
    return false;
  }
}

export function MoreOnThis({
  answerId,
  claim,
}: {
  answerId: string;
  claim: string;
}) {
  const [pressed, setPressed] = React.useState(false);
  React.useEffect(() => setPressed(read(answerId)), [answerId]);

  const change = (wants: boolean) => {
    setPressed(wants);
    try {
      if (wants) localStorage.setItem(key(answerId), '1');
      else localStorage.removeItem(key(answerId));
    } catch {
      // Private mode: the press still counts below, it just is not remembered here.
    }
    if (AUTH_ENABLED) {
      void supabaseLater().then((client) =>
        client
          .from('interest_signals')
          .insert({ topic: `answer:${answerId}`, wants }),
      );
    }
  };

  return (
    <InterestSignal topic={claim} pressed={pressed} onPressedChange={change} />
  );
}
