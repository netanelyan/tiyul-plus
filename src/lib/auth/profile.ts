'use client';

import { effectivePlan, isRole, type Plan, type Role } from '@/lib/plans';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The user's profile (the profiles table, see supabase-profiles.sql):
 * display name, phone, avatar (downscaled data URL), countries visited and
 * default preferences. RLS guarantees each user reads/writes only their own
 * row.
 */

export interface UserProfile {
  displayName: string;
  phone: string;
  avatar: string | null;
  visited: string[]; // ISO2 codes
  prefs: { kosher?: boolean };
  /** Discoverability in the traveler search - off by default (privacy first) */
  isPublic: boolean;
  /**
   * The subscription plan - read-only on the client side: the column is
   * written exclusively by the Stripe webhook via the service role (see
   * supabase-premium.sql).
   */
  plan: Plan;
  /**
   * The role. Written exclusively by the service role (see
   * supabase-admin.sql), so from the client's perspective this is a
   * read-only column - and even if somebody edits it in browser memory it
   * buys them nothing: every admin route re-reads the role from the
   * database. The value here is used only to decide whether to show a link
   * to the admin area.
   */
  role: Role;
  /** When premium expires. null = unlimited (an active subscription or a permanent grant). */
  planUntil: string | null;
  /**
   * When the terms of use and privacy policy were first accepted, and for
   * which version (see src/lib/legal.ts and supabase-consent.sql). null =
   * consent not yet recorded - e.g. an account created before this
   * mechanism was built.
   */
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

export const EMPTY_PROFILE: UserProfile = {
  displayName: '',
  phone: '',
  avatar: null,
  visited: [],
  prefs: {},
  isPublic: false,
  plan: 'free',
  role: 'user',
  planUntil: null,
  termsAcceptedAt: null,
  termsVersion: null,
};

/** What is exposed about a public traveler - never email/phone/trips */
export interface PublicProfile {
  userId: string;
  displayName: string;
  avatar: string | null;
  visited: string[];
}

interface Row {
  display_name: string | null;
  phone: string | null;
  avatar: string | null;
  visited: unknown;
  prefs: unknown;
  is_public?: boolean;
  plan?: string;
  role?: string;
  plan_until?: string | null;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
}

export async function fetchProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  // The plan column comes from supabase-premium.sql, terms_* come from
  // supabase-consent.sql; if a SQL file has not run yet, the select that
  // includes it fails - we fall back to a select without its columns so
  // profiles do not break.
  //
  // Four fallback tiers, because each SQL block adds columns and not all of
  // them have run: first with terms_accepted_at/terms_version
  // (supabase-consent.sql), then with role/plan_until (supabase-admin.sql),
  // then with plan only (supabase-premium.sql), and finally the basic
  // columns. Without this, a profile breaks entirely just because one SQL
  // block was never run.
  let { data, error } = await supabase
    .from('profiles')
    .select(
      'display_name,phone,avatar,visited,prefs,is_public,plan,role,plan_until,terms_accepted_at,terms_version',
    )
    .maybeSingle();
  if (error) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('display_name,phone,avatar,visited,prefs,is_public,plan,role,plan_until')
      .maybeSingle());
  }
  if (error) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('display_name,phone,avatar,visited,prefs,is_public,plan')
      .maybeSingle());
  }
  if (error) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('display_name,phone,avatar,visited,prefs,is_public')
      .maybeSingle());
    if (error) return null;
  }
  if (!data) return { ...EMPTY_PROFILE }; // no row yet - empty profile
  const r = data as Row;
  return {
    displayName: r.display_name ?? '',
    phone: r.phone ?? '',
    avatar: r.avatar ?? null,
    visited: Array.isArray(r.visited) ? (r.visited as string[]).filter((c) => typeof c === 'string') : [],
    prefs: r.prefs && typeof r.prefs === 'object' ? (r.prefs as UserProfile['prefs']) : {},
    isPublic: r.is_public === true,
    // effectivePlan rather than a direct comparison: an expired grant
    // reverts to free in the UI too, so the screen does not promise a
    // premium the server no longer honors.
    plan: effectivePlan(r),
    role: isRole(r.role) ? r.role : 'user',
    planUntil: r.plan_until ?? null,
    termsAcceptedAt: r.terms_accepted_at ?? null,
    termsVersion: r.terms_version ?? null,
  };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  profile: UserProfile,
): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: uid,
      display_name: profile.displayName.slice(0, 60) || null,
      phone: profile.phone.slice(0, 30) || null,
      avatar: profile.avatar && profile.avatar.length < 150_000 ? profile.avatar : profile.avatar === null ? null : undefined,
      visited: profile.visited.slice(0, 250),
      prefs: profile.prefs,
      is_public: profile.isPublic,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

/**
 * One-time recording of consent to the terms of use and privacy policy.
 * Called from AuthContext right after a successful code verification, and
 * only when no prior consent was recorded - so a repeat login does not
 * overwrite the original date with today's date.
 *
 * A deliberately partial upsert: the object sent contains only these two
 * columns (plus user_id/updated_at), so it does not touch the display name,
 * phone or the rest of the profile - and even if there is no row at all
 * yet, the upsert creates it with default values in the other columns.
 */
export async function recordTermsAcceptance(
  supabase: SupabaseClient,
  version: string,
): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: uid,
      terms_accepted_at: new Date().toISOString(),
      terms_version: version,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

/**
 * Client-side downscaling of a profile picture to a small data URL
 * (192px square, JPEG). ~10-25KB - stored directly in the table, no
 * Storage. Returns null if the file could not be read as an image.
 */
export function imageToAvatar(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const SIZE = 192;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      // Square crop from the center of the image
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/* ---------- The traveler community (public_profiles view) ---------- */

interface PublicRow {
  user_id: string;
  display_name: string | null;
  avatar: string | null;
  visited: unknown;
}

const toPublic = (r: PublicRow): PublicProfile => ({
  userId: r.user_id,
  displayName: r.display_name ?? '',
  avatar: r.avatar ?? null,
  visited: Array.isArray(r.visited) ? (r.visited as string[]).filter((c) => typeof c === 'string') : [],
});

/**
 * Searching public travelers: by name (partial ilike), or - when the input
 * looks like an email address - an exact email match via RPC (the email is
 * never exposed; partial search over emails is blocked by design).
 */
export async function searchPublicProfiles(
  supabase: SupabaseClient,
  query: string,
): Promise<PublicProfile[]> {
  const raw = query.trim();
  if (/^\S+@\S+\.\S+$/.test(raw)) {
    const { data, error } = await supabase.rpc('find_traveler_by_email', { p_email: raw });
    if (error || !data) return [];
    return (data as PublicRow[]).map(toPublic);
  }
  // `%` and `_` are SQL LIKE wildcards, and `*` is PostgREST's wildcard
  // (which it translates to `%`). All of them are stripped - this search
  // looks up a name, it does not run a user-supplied pattern.
  const q = raw.replace(/[%_*]/g, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('public_profiles')
    .select('user_id,display_name,avatar,visited')
    .ilike('display_name', `%${q}%`)
    .limit(20);
  if (error || !data) return [];
  return (data as PublicRow[]).map(toPublic);
}

/** A single public profile by id - null if private/nonexistent */
export async function fetchPublicProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('user_id,display_name,avatar,visited')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return toPublic(data as PublicRow);
}
