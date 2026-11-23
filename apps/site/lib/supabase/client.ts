'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | undefined;

/** The browser's Supabase client, one per tab. Only call it when AUTH_ENABLED. */
export function supabase(): SupabaseClient {
  if (!AUTH_ENABLED) throw new Error('Supabase is not configured');
  client ??= createBrowserClient(SUPABASE_URL!, SUPABASE_KEY!);
  return client;
}
