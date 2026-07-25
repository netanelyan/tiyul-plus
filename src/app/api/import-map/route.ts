import { NextResponse } from 'next/server';
import {
  extractMid,
  fetchKmlByMid,
  isShortLink,
  kmlToDestination,
  parseKml,
  resolveShortLink,
} from '@/lib/import/mymaps';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { PLAN_LIMITS } from '@/lib/plans';

/**
 * POST { url } → { destination } (בסגנון explored) או { error } בעברית.
 * המפה חייבת להיות משותפת כ"כל מי שיש לו הקישור" - אחרת גוגל לא מחזיר
 * KML ואנחנו אומרים את זה למשתמש במקום לנחש.
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('import-burst', caller.id, 3, 60_000);
  if (!burst.ok) {
    return NextResponse.json(
      { error: 'יותר מדי ניסיונות ברצף - חכו רגע ונסו שוב' },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } },
    );
  }
  const daily = checkLimit(
    'import-day',
    caller.id,
    PLAN_LIMITS[caller.plan].importsPerDay,
    24 * 60 * 60 * 1000,
  );
  if (!daily.ok) {
    return NextResponse.json(
      { error: 'הגעתם למכסת הייבוא היומית. המכסה מתאפסת פעם ביום - או שמשדרגים לפרימיום.' },
      { status: 429 },
    );
  }

  let url = '';
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body.url === 'string' ? body.url.trim().slice(0, 500) : '';
  } catch {
    /* גוף לא תקין */
  }
  if (!url) return NextResponse.json({ error: 'הדביקו קישור למפה מ-Google My Maps' }, { status: 400 });

  // mid ישירות מהקישור, או פתיחה אחת של קישור מקוצר של גוגל
  let mid = extractMid(url);
  if (!mid && isShortLink(url)) mid = await resolveShortLink(url);
  if (!mid) {
    return NextResponse.json({
      error:
        'לא זיהינו קישור של Google My Maps. הקישור צריך להיראות כמו google.com/maps/d/… עם mid=, או קישור קצר של גוגל מפות.',
    });
  }

  const kml = await fetchKmlByMid(mid);
  if (!kml) {
    return NextResponse.json({
      error:
        'לא הצלחנו למשוך את המפה. ודאו שהמפה משותפת כ"כל מי שיש לו הקישור יכול להציג" (בהגדרות השיתוף של My Maps) ונסו שוב.',
    });
  }

  const parsed = parseKml(kml);
  if (!parsed) {
    return NextResponse.json({
      error: 'המפה נמשכה אבל לא מצאנו בה נקודות (Placemarks). ודאו שיש במפה סימונים של מקומות.',
    });
  }

  const destination = kmlToDestination(parsed, mid);
  return NextResponse.json({
    destination,
    truncated: parsed.truncated,
  });
}
