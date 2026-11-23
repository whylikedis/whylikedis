import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_ENABLED, safeNext } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

// Where a provider sends someone back after they say yes: swap the one-time code for a
// session, then go where they were headed. Any failure goes back to the sign-in page with a reason.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get('next'));
  const back = (reason: string) =>
    NextResponse.redirect(
      new URL(
        `/sign-in/?error=${reason}&next=${encodeURIComponent(next)}`,
        url.origin,
      ),
    );

  if (!AUTH_ENABLED) return back('unavailable');
  if (url.searchParams.get('error'))
    return back(url.searchParams.get('error_code') ?? 'cancelled');
  const code = url.searchParams.get('code');
  if (!code) return back('missing_code');

  const { error } = await (
    await supabaseServer()
  ).auth.exchangeCodeForSession(code);
  if (error) return back(error.code ?? 'exchange_failed');
  return NextResponse.redirect(new URL(next, url.origin));
}
