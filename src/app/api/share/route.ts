import { NextResponse } from 'next/server';
import type { Trip } from '@/lib/trip/types';
import { encodeTripShare, decodeTripShare } from '@/lib/trip/share';
import { createShareCode } from '@/lib/trip/shareStore';

/**
 * POST { trip } → { code | null }.
 * מקודדים את הטיול ל-payload של v1 (encodeTripShare), מוודאים שהוא
 * בכלל ניתן לפענוח מול הדאטה האוצרת, ושומרים אותו תחת קוד קצר.
 * בלי Supabase מוגדר - מחזירים null והלקוח נופל לקישור הארוך.
 */
export async function POST(req: Request) {
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
