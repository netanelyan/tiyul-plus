import { effectivePlan, type Plan } from '@/lib/plans';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

/**
 * שרת בלבד - זיהוי הקורא לצורך מכסות ותוכנית.
 *
 * מחובר (Authorization: Bearer <supabase access token>): הטוקן מאומת מול
 * GoTrue (/auth/v1/user) והתוכנית נקראת משורת הפרופיל שלו (RLS - הטוקן
 * של המשתמש קורא רק את השורה שלו). שני הצעדים במטמון קצר בזיכרון כדי
 * לא להוסיף שתי קריאות רשת לכל הודעת צ׳אט.
 *
 * לא מחובר: הזהות היא כתובת ה-IP (x-forwarded-for הראשון - מה ש-Vercel
 * מציב). אין ניסיון לזהות מעבר לזה.
 */

export interface Caller {
  /** מפתח המכסות: user:<uid> או ip:<addr> */
  id: string;
  plan: Plan;
  userId: string | null;
}

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TOKEN_TTL = 5 * 60 * 1000;
const tokenCache = new Map<string, CacheEntry<string | null>>(); // token -> userId
const planCache = new Map<string, CacheEntry<Plan>>(); // userId -> plan

function cached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const e = map.get(key);
  if (!e) return undefined;
  if (e.expiresAt <= Date.now()) {
    map.delete(key);
    return undefined;
  }
  return e.value;
}

function put<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expiresAt: Date.now() + TOKEN_TTL });
  if (map.size > 5000) map.clear();
}

async function verifyToken(token: string): Promise<string | null> {
  const hit = cached(tokenCache, token);
  if (hit !== undefined) return hit;
  let userId: string | null = null;
  try {
    const res = await fetch(`${supaUrl()}/auth/v1/user`, {
      headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const user = (await res.json()) as { id?: string };
      if (typeof user.id === 'string' && user.id) userId = user.id;
    }
  } catch {
    /* GoTrue לא זמין - מתייחסים כאנונימי, לא מפילים את הבקשה */
  }
  put(tokenCache, token, userId);
  return userId;
}

async function fetchPlan(userId: string, token: string): Promise<Plan> {
  const hit = cached(planCache, userId);
  if (hit !== undefined) return hit;
  let plan: Plan = 'free';
  try {
    const key = anonKey()!;
    const res = await fetch(
      `${supaUrl()}/rest/v1/profiles?${pgQuery(eq('user_id', userId), pgSelect(['plan', 'plan_until']))}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (res.ok) {
      // effectivePlan ולא `plan === 'premium'`: הענקה של אדמין או קוד
      // הטבה נושאת plan_until, ובלי הבדיקה הזאת הענקה ל-30 יום הייתה
      // ממשיכה להעניק מכסת פרימיום לנצח. נקודת אמת אחת - ראו lib/plans.ts.
      const rows = (await res.json()) as { plan?: string; plan_until?: string | null }[];
      plan = effectivePlan(rows[0] ?? null);
    }
  } catch {
    /* אין קריאת תוכנית - free הוא ברירת המחדל הבטוחה */
  }
  if (plan === 'free') {
    // ה-SQL של supabase-admin.sql אולי עוד לא רץ, ואז הבחירה עם
    // plan_until נכשלת כולה. ניסיון שני בלי העמודה, בדיוק כמו
    // ה-fallback ב-lib/auth/profile.ts, כדי שפרימיום קיים לא ייעלם.
    try {
      const res = await fetch(
        `${supaUrl()}/rest/v1/profiles?${pgQuery(eq('user_id', userId), pgSelect(['plan']))}`,
        {
          headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as { plan?: string }[];
        if (rows[0]?.plan === 'premium') plan = 'premium';
      }
    } catch {
      /* נשארים ב-free */
    }
  }
  put(planCache, userId, plan);
  return plan;
}

export function requestIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function resolveCaller(request: Request): Promise<Caller> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (token && supaUrl() && anonKey()) {
    const userId = await verifyToken(token);
    if (userId) {
      const plan = await fetchPlan(userId, token);
      return { id: `user:${userId}`, plan, userId };
    }
  }
  return { id: `ip:${requestIp(request)}`, plan: 'free', userId: null };
}

/** ביטול מטמון התוכנית אחרי שדרוג (למשל מה-webhook) */
export function invalidatePlanCache(userId: string): void {
  planCache.delete(userId);
}

/** לבדיקות בלבד */
export function resetIdentityForTest(): void {
  tokenCache.clear();
  planCache.clear();
}
