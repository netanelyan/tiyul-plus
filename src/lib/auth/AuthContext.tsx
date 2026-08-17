'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './client';
import { EMPTY_PROFILE, fetchProfile, recordTermsAcceptance, upsertProfile, type UserProfile } from './profile';
import { TERMS_VERSION } from '@/lib/legal';

/**
 * The account context: login by a one-time code sent to an email address (OTP) -
 * with no passwords. enabled=false when there is no Supabase configuration - the
 * interface simply does not show a login option.
 */

interface AuthApi {
  enabled: boolean;
  user: User | null;
  /** null until the initial session check has finished */
  ready: boolean;
  /** The user's profile (loaded after login); null when signed out or still loading */
  profile: UserProfile | null;
  /** Updating the profile: optimistic in memory + an upsert to the server */
  saveProfile: (patch: Partial<UserProfile>) => Promise<boolean>;
  /**
   * Re-reading the profile from the server. Needed when something **outside** the
   * client changed it - redeeming a promo code, a premium grant or a role change are
   * written by the service role, so the in-memory profile knows nothing about them.
   */
  reloadProfile: () => Promise<void>;
  sendCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useAuth must be used inside <AuthProvider>');
  return api;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // The current state, synchronously - saveProfile must compute the merge immediately
  // rather than relying on a state update (which is not guaranteed to be synchronous):
  // two consecutive saveProfile calls could otherwise overwrite fields with an empty profile.
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  const reloadProfile = useCallback(async () => {
    if (!supabase || !user) return;
    const p = await fetchProfile(supabase);
    if (p) setProfile(p);
  }, [supabase, user]);

  // Load the profile after login; reset on sign-out
  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchProfile(supabase).then((p) => {
      if (!cancelled) setProfile(p ?? { ...EMPTY_PROFILE });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const saveProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!supabase || !user) return false;
      const next: UserProfile = { ...(profileRef.current ?? EMPTY_PROFILE), ...patch };
      profileRef.current = next; // chaining saveProfile calls in the same tick stays consistent
      setProfile(next);
      return upsertProfile(supabase, next);
    },
    [supabase, user],
  );

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const sendCode = useCallback(
    async (email: string) => {
      if (!supabase) return { ok: false, error: 'החשבונות לא מוגדרים בסביבה הזו' };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },
    [supabase],
  );

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      if (!supabase) return { ok: false, error: 'החשבונות לא מוגדרים בסביבה הזו' };
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) return { ok: false, error: friendly(error.message) };
      // The login itself is the moment of consent (see the text beside the button in
      // the modal) - recorded here, on the first successful sign-in only, and not on
      // every subsequent one. If the write fails (network, or the supabase-consent.sql
      // migration has not run yet) the login still succeeds - this must not block a
      // user from the service.
      try {
        const p = await fetchProfile(supabase);
        if (p && !p.termsAcceptedAt) await recordTermsAcceptance(supabase, TERMS_VERSION);
      } catch {
        /* not critical - it will be recorded on the next sign-in */
      }
      return { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <Ctx.Provider
      value={{ enabled: Boolean(supabase), user, ready, profile, saveProfile, reloadProfile, sendCode, verifyCode, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Translating the common GoTrue errors into human Hebrew */
function friendly(message: string): string {
  const m = message.toLowerCase();
  // Helps diagnosis: the original error is kept in the console (not shown to the user)
  console.error('[auth]', message);
  if (m.includes('error sending') || m.includes('smtp'))
    return 'שליחת המייל נכשלה - כנראה בעיה בהגדרות שליחת המיילים (SMTP). בדקו את הגדרות השולח.';
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי ניסיונות - נסו שוב בעוד כמה דקות';
  if (m.includes('invalid') && m.includes('otp')) return 'הקוד שגוי או שפג תוקפו - בדקו את המייל האחרון';
  if (m.includes('expired')) return 'הקוד פג תוקף - שלחו קוד חדש';
  if (m.includes('invalid') && m.includes('email')) return 'כתובת המייל לא תקינה';
  return 'משהו השתבש - נסו שוב';
}
