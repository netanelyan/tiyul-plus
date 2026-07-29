'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Destination } from '@/lib/types';

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

export function cachedCity(slug: string): Destination | undefined {
  return cache.get(slug);
}

/** לטסטים בלבד: מטמון ברמת מודול שורד בין טסטים ומזייף תוצאות */
export function __resetCityCache(): void {
  cache.clear();
  inflight.clear();
  missing.clear();
}

export async function fetchCities(slugs: string[]): Promise<Destination[]> {
  const need = [...new Set(slugs)].filter((s) => s && !cache.has(s) && !missing.has(s));
  const waits = need.map((s) => inflight.get(s)).filter(Boolean) as Promise<unknown>[];
  const toFetch = need.filter((s) => !inflight.has(s));

  if (toFetch.length > 0) {
    const p = fetch(`/api/cities?slugs=${encodeURIComponent(toFetch.join(','))}`)
      .then((r) => (r.ok ? r.json() : { cities: [] }))
      .then((data: { cities?: Destination[] }) => {
        for (const c of data.cities ?? []) if (c?.slug) cache.set(c.slug, c);
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
