'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Destination } from '@/lib/types';
import { saveCities, storedCities } from './cityStore';

/**
 * מטמון הערים בצד הלקוח: מוריד מ-`/api/cities` רק את הערים שהטיול
 * באמת נוגע בהן, ושומר אותן לכל אורך החיים של הטאב.
 *
 * **הבעיה שזה פותר, במספרים.** `TripWorkspace` ייבא את הקטלוג כולו
 * סטטית, ולכן `/chat` ו-`/planner` הורידו 492kB דחוסים (2MB לפני
 * דחיסה) כדי לצייר טיול של עיר אחת עד שש. עיר עולה כ-7kB.
 *
 * **למה מטמון ברמת המודול ולא state:** המשתמש מחליף בין `/chat`
 * ל-`/planner`, בין טיולים, ובין ימים - ובלי מטמון כל מעבר כזה היה
 * בקשת רשת נוספת על אותה דאטה בדיוק. הדאטה סטטית לכל deploy, אז אין
 * שום סיבה לבקש אותה פעמיים.
 */
const cache = new Map<string, Destination>();
const inflight = new Map<string, Promise<unknown>>();
/** slug שהשרת החזיר עליו כלום - כדי לא לנסות אותו בלולאה */
const missing = new Set<string>();

/**
 * המטמון בזיכרון נטען פעם אחת מהדיסק (`cityStore`), כדי שפתיחה של
 * האפליקציה **בלי רשת** תצייר את הטיול מיד במקום להיתקע בטעינה.
 * זה גם מה שהופך את "טוען" למצב קצר ואמיתי: אם העיר כבר נשמרה,
 * אין המתנה בכלל, גם כשיש רשת.
 */
let hydrated = false;
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  for (const [slug, city] of Object.entries(storedCities())) if (!cache.has(slug)) cache.set(slug, city);
}

export function cachedCity(slug: string): Destination | undefined {
  hydrate();
  return cache.get(slug);
}

/** לטסטים בלבד: מטמון ברמת מודול שורד בין טסטים ומזייף תוצאות */
export function __resetCityCache(): void {
  cache.clear();
  inflight.clear();
  missing.clear();
  hydrated = false;
}

export async function fetchCities(slugs: string[]): Promise<Destination[]> {
  hydrate();
  const need = [...new Set(slugs)].filter((s) => s && !cache.has(s) && !missing.has(s));
  const waits = need.map((s) => inflight.get(s)).filter(Boolean) as Promise<unknown>[];
  const toFetch = need.filter((s) => !inflight.has(s));

  if (toFetch.length > 0) {
    const p = fetch(`/api/cities?slugs=${encodeURIComponent(toFetch.join(','))}`)
      .then((r) => (r.ok ? r.json() : { cities: [] }))
      .then((data: { cities?: Destination[] }) => {
        const got = (data.cities ?? []).filter((c) => c?.slug);
        for (const c of got) cache.set(c.slug, c);
        // לדיסק, כדי שהטיול ייפתח בלי רשת. נשמר רק מה שהתבקש בפועל
        // עבור טיול - `pruneCities` בהמשך מוחק מה שכבר לא שייך לאף טיול.
        saveCities(got);
        // מה שלא חזר - לא קיים בקטלוג (או נכשל); מסמנים כדי לא לנסות שוב
        for (const s of toFetch) if (!cache.has(s)) missing.add(s);
      })
      .catch(() => {
        // רשת נפלה: **לא** מסמנים חסר, כדי שניסיון הבא יעבוד
        for (const s of toFetch) inflight.delete(s);
      })
      .finally(() => {
        for (const s of toFetch) inflight.delete(s);
      });
    for (const s of toFetch) inflight.set(s, p);
    waits.push(p);
  }

  await Promise.all(waits);
  return slugs.map((s) => cache.get(s)).filter((d): d is Destination => Boolean(d));
}

export interface CityData {
  cities: Record<string, Destination>;
  /** true רק בהמתנה הראשונה, כשעוד אין שום עיר ביד - ראו השימוש */
  loading: boolean;
}

export function useCityData(slugs: string[]): CityData {
  // מפתח יציב: מערך חדש בכל render לא יפעיל את האפקט מחדש
  const key = useMemo(() => [...new Set(slugs)].filter(Boolean).sort().join(','), [slugs]);
  const [, bump] = useState(0);

  useEffect(() => {
    hydrate();
    const list = key ? key.split(',') : [];
    if (list.length === 0) return;
    if (list.every((s) => cache.has(s) || missing.has(s))) return;
    let alive = true;
    void fetchCities(list).then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return useMemo(() => {
    hydrate();
    const list = key ? key.split(',') : [];
    const cities: Record<string, Destination> = {};
    for (const s of list) {
      const c = cache.get(s);
      if (c) cities[s] = c;
    }
    // "טוען" = יש ערים לבקש ואף אחת מהן עוד לא ביד. אחרי שיש ולו אחת
    // ממשיכים לצייר, כדי שהוספת עיר באמצע שיחה לא תרוקן את המסך.
    const known = list.filter((s) => cache.has(s) || missing.has(s)).length;
    return { cities, loading: list.length > 0 && known === 0 };
  }, [key, cache.size, missing.size]);
}
