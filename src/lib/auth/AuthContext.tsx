'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './client';

/**
 * הקשר החשבון: התחברות בקוד חד-פעמי למייל (OTP) - בלי סיסמאות.
 * enabled=false כשאין הגדרות Supabase - הממשק פשוט לא מציג התחברות.
 */

interface AuthApi {
  enabled: boolean;
  user: User | null;
  /** null עד שבדיקת הסשן הראשונית הסתיימה */
  ready: boolean;
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
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <Ctx.Provider value={{ enabled: Boolean(supabase), user, ready, sendCode, verifyCode, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

/** תרגום שגיאות GoTrue הנפוצות לעברית אנושית */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי ניסיונות - נסו שוב בעוד כמה דקות';
  if (m.includes('invalid') && m.includes('otp')) return 'הקוד שגוי או שפג תוקפו - בדקו את המייל האחרון';
  if (m.includes('expired')) return 'הקוד פג תוקף - שלחו קוד חדש';
  if (m.includes('invalid') && m.includes('email')) return 'כתובת המייל לא תקינה';
  return 'משהו השתבש - נסו שוב';
}
