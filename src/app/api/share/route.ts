import { NextResponse } from 'next/server';
import type { Trip } from '@/lib/trip/types';
import { encodeTripShare, decodeTripShare } from '@/lib/trip/share';
import { createShareCode } from '@/lib/trip/shareStore';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { PLAN_LIMITS } from '@/lib/plans';

/**
 * POST { trip } → { code | null }.
 * מקודדים את הטיול ל-payload של v1 (encodeTripShare), מוודאים שהוא
 * בכלל ניתן לפענוח מול הדאטה האוצרת, ושומרים אותו תחת קוד קצר.
 * בלי Supabase מוגדר - מחזירים null והלקוח נופל לקישור הארוך.
 */
export async function POST(req: Request) {
  // מכסה: הטבלה ציבורית-כתיבה בעיצובה (anon insert), אז השער כאן מונע
  // מילוי שלה בספאם. חריגה מחזירה code:null - הלקוח נופל בשקט לקישור
  // הארוך, ששום מכסה לא חוסמת.
  const caller = await resolveCaller(req);
  const burst = checkLimit('share-burst', caller.id, 5, 10 * 60_000);
  const daily = checkLimit('share-day', caller.id, PLAN_LIMITS[caller.plan].sharesPerDay, 24 * 60 * 60 * 1000);
  if (!burst.ok || !daily.ok) {
    return NextResponse.json({ code: null, error: 'rate-limited' }, { status: 429 });
  }

  let trip: Trip;
  try {
    ({ trip } = (await req.json()) as { trip: Trip });
  } catch {
    return NextResponse.json({ code: null, error: 'bad-request' }, { status: 400 });
  }
  if (!trip?.days?.length) {
    return NextResponse.json({ code: null, error: 'empty-trip' }, { status: 400 });
  }

  const payload = encodeTripShare(trip);
  // אימות עגול: אם ה-payload לא נפתח לטיול תקין מול הדאטה - לא שומרים
  if (!decodeTripShare(payload)) {
    return NextResponse.json({ code: null, error: 'invalid-trip' }, { status: 400 });
  }

  const code = await createShareCode(payload);
  return NextResponse.json({ code });
}
