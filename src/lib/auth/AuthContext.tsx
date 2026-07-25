'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './client';
import { EMPTY_PROFILE, fetchProfile, upsertProfile, type UserProfile } from './profile';

/**
 * הקשר החשבון: התחברות בקוד חד-פעמי למייל (OTP) - בלי סיסמאות.
 * enabled=false כשאין הגדרות Supabase - הממשק פשוט לא מציג התחברות.
 */

interface AuthApi {
  enabled: boolean;
  user: User | null;
  /** null עד שבדיקת הסשן הראשונית הסתיימה */
  ready: boolean;
  /** פרופיל המשתמש (נטען אחרי התחברות); null כשלא מחוברים/עוד נטען */
  profile: UserProfile | null;
  /** עדכון פרופיל: אופטימי בזיכרון + upsert לשרת */
  saveProfile: (patch: Partial<UserProfile>) => Promise<boolean>;
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
  // המצב העדכני באופן סינכרוני - saveProfile חייב לחשב את המיזוג מיד,
  // בלי להסתמך על עדכון ה-state (שאינו מובטח להיות סינכרוני): שני
  // saveProfile רצופים היו עלולים לדרוס שדות עם פרופיל ריק.
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  // טעינת הפרופיל אחרי התחברות; איפוס בהתנתקות
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
      profileRef.current = next; // שרשור saveProfile-ים באותו טיק נשאר עקבי
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
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <Ctx.Provider
      value={{ enabled: Boolean(supabase), user, ready, profile, saveProfile, sendCode, verifyCode, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** תרגום שגיאות GoTrue הנפוצות לעברית אנושית */
function friendly(message: string): string {
  const m = message.toLowerCase();
  // עוזר לאבחון: השגיאה המקורית נשמרת בקונסול (לא מוצגת למשתמש)
  console.error('[auth]', message);
  if (m.includes('error sending') || m.includes('smtp'))
    return 'שליחת המייל נכשלה - כנראה בעיה בהגדרות שליחת המיילים (SMTP). בדקו את הגדרות השולח.';
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי ניסיונות - נסו שוב בעוד כמה דקות';
  if (m.includes('invalid') && m.includes('otp')) return 'הקוד שגוי או שפג תוקפו - בדקו את המייל האחרון';
  if (m.includes('expired')) return 'הקוד פג תוקף - שלחו קוד חדש';
  if (m.includes('invalid') && m.includes('email')) return 'כתובת המייל לא תקינה';
  return 'משהו השתבש - נסו שוב';
}
