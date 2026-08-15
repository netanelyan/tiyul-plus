'use client';

import { effectivePlan, isRole, type Role } from '@/lib/plans';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * פרופיל המשתמש (טבלת profiles, ראו supabase-profiles.sql):
 * שם תצוגה, טלפון, תמונה (data URL מוקטן), מדינות שביקר בהן והעדפות
 * ברירת-מחדל. RLS מבטיח שכל משתמש קורא/כותב רק את השורה שלו.
 */

export interface UserProfile {
  displayName: string;
  phone: string;
  avatar: string | null;
  visited: string[]; // קודי ISO2
  prefs: { kosher?: boolean };
  /** גילוי בחיפוש המטיילים - כבוי כברירת מחדל (פרטיות תחילה) */
  isPublic: boolean;
  /**
   * תוכנית המנוי - לקריאה בלבד בצד הלקוח: העמודה נכתבת אך ורק ע"י
   * ה-webhook של Stripe דרך ה-service role (ראו supabase-premium.sql).
   */
  plan: 'free' | 'premium';
  /**
   * התפקיד. נכתב אך ורק ע"י ה-service role (ראו supabase-admin.sql), אז
   * מבחינת הלקוח זו עמודה לקריאה בלבד - וגם אם מישהו יערוך אותה בזיכרון
   * הדפדפן זה לא יקנה לו כלום: כל נתיב ניהול קורא את התפקיד מהדאטהבייס
   * מחדש. הערך כאן משמש רק להחלטה אם להציג קישור לאזור הניהול.
   */
  role: Role;
  /** מתי הפרימיום פג. null = ללא הגבלה (מנוי פעיל או הענקה לתמיד). */
  planUntil: string | null;
  /**
   * מתי אושרו תנאי השימוש ומדיניות הפרטיות לראשונה, ולאיזו גרסה
   * (ראו src/lib/legal.ts ו-supabase-consent.sql). null = טרם נרשמה
   * הסכמה - למשל חשבון שנוצר לפני שהמנגנון הזה נבנה.
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

/** מה שנחשף על מטייל ציבורי - לעולם לא מייל/טלפון/טיולים */
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
  // עמודת plan מגיעה מ-supabase-premium.sql, terms_* מגיעות מ-
  // supabase-consent.sql; אם קובץ SQL עוד לא רץ הבחירה איתו נכשלת -
  // נופלים לבחירה בלי העמודות שלו כדי שפרופילים לא יישברו.
  //
  // ארבע מדרגות נסיגה, כי כל בלוק SQL מוסיף עמודות ולא כולם רצו: קודם
  // עם terms_accepted_at/terms_version (supabase-consent.sql), אחר כך
  // עם role/plan_until (supabase-admin.sql), אחר כך עם plan בלבד
  // (supabase-premium.sql), ולבסוף העמודות הבסיסיות. בלי זה, פרופיל
  // נשבר לגמרי רק כי בלוק SQL אחד עוד לא הורץ.
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
  if (!data) return { ...EMPTY_PROFILE }; // עוד אין שורה - פרופיל ריק
  const r = data as Row;
  return {
    displayName: r.display_name ?? '',
    phone: r.phone ?? '',
    avatar: r.avatar ?? null,
    visited: Array.isArray(r.visited) ? (r.visited as string[]).filter((c) => typeof c === 'string') : [],
    prefs: r.prefs && typeof r.prefs === 'object' ? (r.prefs as UserProfile['prefs']) : {},
    isPublic: r.is_public === true,
    // effectivePlan ולא השוואה ישירה: הענקה שפגה חוזרת ל-free גם ב-UI,
    // כדי שהמסך לא יבטיח פרימיום שהשרת כבר לא מכבד.
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
 * רישום חד-פעמי של הסכמה לתנאי השימוש ולמדיניות הפרטיות. נקרא מ-
 * AuthContext מיד אחרי אימות קוד מוצלח, ורק כשעוד לא נרשמה הסכמה
 * קודמת - כדי שכניסה חוזרת לא תדרוס את התאריך המקורי בתאריך של היום.
 *
 * upsert חלקי בכוונה: האובייקט הנשלח מכיל רק את שתי העמודות האלה (ואת
 * user_id/updated_at), ולכן הוא לא נוגע בשם תצוגה, טלפון או שאר
 * הפרופיל - גם אם עדיין אין שורה בכלל, ה-upsert יוצר אותה עם ערכי
 * ברירת המחדל בשאר העמודות.
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
 * הקטנת תמונת פרופיל בצד הלקוח ל-data URL קטן (ריבוע 192px, JPEG).
 * כ-10-25KB - נשמר ישירות בטבלה, בלי Storage. מחזיר null אם הקובץ
 * לא נקרא כתמונה.
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
      // חיתוך ריבועי ממרכז התמונה
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

/* ---------- קהילת המטיילים (public_profiles view) ---------- */

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
 * חיפוש מטיילים ציבוריים: לפי שם (ilike חלקי), או - כשהקלט נראה כמו
 * כתובת מייל - התאמת מייל מדויקת דרך RPC (המייל לא נחשף לעולם; חיפוש
 * חלקי על מיילים חסום מעצם העיצוב).
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
  // `%` ו-`_` הם תווים כלליים של SQL LIKE, ו-`*` הוא התו הכללי של
  // PostgREST (שמתרגם אותו ל-`%`). כולם יורדים - החיפוש הזה מחפש שם,
  // לא מריץ תבנית של המשתמש.
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

/** פרופיל ציבורי בודד לפי מזהה - null אם פרטי/לא קיים */
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
