/**
 * שרת בלבד. **לעולם לא לייבא מקומפוננטת client** - המפתח כאן עוקף RLS
 * לחלוטין, ודליפה שלו לדפדפן שווה למסירת הדאטהבייס.
 *
 * REST ישיר מול Supabase עם ה-service role, בלי תלות חדשה (חוק קשיח 6),
 * באותו סגנון כמו `trip/shareStore.ts`.
 *
 * בלי `SUPABASE_SERVICE_ROLE_KEY` הכל מחזיר null / false והפיצ׳רים
 * שתלויים בו כבויים בשקט - האתר עצמו ממשיך לעבוד בדיוק כמו קודם. זה
 * המצב בפועל עד שנתנאל מריץ את ה-SQL ומוסיף את המפתח.
 */

const url = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const adminDbEnabled = () => Boolean(url() && serviceKey());

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const k = serviceKey()!;
  const h: Record<string, string> = {
    apikey: k,
    'Content-Type': 'application/json',
    ...extra,
  };
  // רק מפתחות בפורמט הישן הם JWT ונשלחים גם כ-Bearer. מפתחות
  // `sb_secret_...` החדשים של Supabase אינם JWT, ו-PostgREST דוחה Bearer
  // עם ערך שאינו JWT - כלומר שליחה עיוורת של שניהם הייתה מפילה את אזור
  // הניהול דווקא בפרויקטים חדשים. אותה הבחנה קיימת כבר ב-trip/shareStore.ts
  // עבור מפתח ה-anon; היא הוחמצה כאן.
  if (k.startsWith('eyJ')) h.Authorization = `Bearer ${k}`;
  return h;
}

/** GET על טבלה/view. `query` הוא query string של PostgREST בלי ה-? */
export async function adminSelect<T>(table: string, query: string): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${table}?${query}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** PATCH לפי תנאי. מחזיר את השורות המעודכנות, או null בכישלון. */
export async function adminUpdate<T>(
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** INSERT (עם upsert אופציונלי לפי מפתח ראשי) */
export async function adminInsert<T>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  opts: { upsert?: boolean } = {},
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers({
        Prefer: opts.upsert
          ? 'resolution=merge-duplicates,return=representation'
          : 'return=representation',
      }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** קריאת RPC (security definer) */
export async function adminRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * מייל לפי uuid ולהיפך, דרך Admin API של GoTrue. המיילים יושבים ב-auth
 * ולא ב-profiles, ובכוונה: הם לא נחשפים לאף שאילתה של לקוח.
 */
export async function userByEmail(email: string): Promise<{ id: string; email: string } | null> {
  if (!adminDbEnabled()) return null;
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return null;
  try {
    const res = await fetch(
      `${url()}/auth/v1/admin/users?filter=${encodeURIComponent(clean)}&per_page=50`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { id: string; email?: string }[] };
    // filter הוא חיפוש חלקי - מחייבים התאמה מדויקת כדי שלא נפעל על
    // חשבון דומה בטעות (מייל הוא מזהה, לא חיפוש חופשי)
    const hit = (data.users ?? []).find((u) => (u.email ?? '').toLowerCase() === clean);
    return hit ? { id: hit.id, email: hit.email ?? clean } : null;
  } catch {
    return null;
  }
}

export async function emailByUserId(userId: string): Promise<string | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/auth/v1/admin/users/${userId}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { email?: string };
    return u.email ?? null;
  } catch {
    return null;
  }
}
