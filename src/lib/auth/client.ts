'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client - user accounts and trip sync.
 * Without the two NEXT_PUBLIC env vars (see .env.example) the feature is
 * silently off: getSupabase() returns null, the login button is not shown, and
 * the site keeps working on localStorage only - the same graceful-degradation
 * approach as the share links.
 */

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

/**
 * Authorization header for the site's API requests (chat, trip building, import):
 * a signed-in user gets quotas by their account and plan instead of by IP.
 * Not signed in / accounts feature off - an empty object, and the server falls
 * back to IP identification.
 */
export async function authHeader(): Promise<Record<string, string>> {
  const sb = getSupabase();
  if (!sb) return {};
  try {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
