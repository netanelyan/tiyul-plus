import { NextResponse } from 'next/server';
import { exploreDestination } from '@/lib/explore/resolver';

/**
 * GET /api/explore?q=<עיר> → יעד ארעי מנתוני ויקיפדיה אמיתיים, או
 * { destination: null } כשאין מספיק נתונים (וזה נאמר ללקוח בכנות).
 * קאש in-memory פר-אינסטנס - חוזרים על אותה עיר בלי לחזור לוויקי.
 */

const cache = new Map<string, { at: number; value: Awaited<ReturnType<typeof exploreDestination>> }>();
const TTL = 1000 * 60 * 60 * 12;
// כישלון (null) נשמר לזמן קצר בלבד - תקלת רשת רגעית בוויקי לא צריכה
// "להרעיל" עיר לחצי יממה
const NULL_TTL = 1000 * 60 * 5;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ destination: null }, { status: 400 });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.value ? TTL : NULL_TTL))
    return NextResponse.json({ destination: hit.value });

  try {
    const destination = await exploreDestination(q);
    cache.set(key, { at: Date.now(), value: destination });
    return NextResponse.json({ destination });
  } catch {
    return NextResponse.json({ destination: null, error: 'explore-failed' }, { status: 502 });
  }
}
