import type { Metadata } from 'next';
import { cache } from 'react';
import { destinations } from '@/data/destinations';
import { decodeTripShare, type SharedTrip } from '@/lib/trip/share';
import { getSharedPayload } from '@/lib/trip/shareStore';
import SharedTripView from './SharedTripView';

/**
 * /t/<code> - צפייה בטיול משותף, לקריאה בלבד, לכל אחד (בלי חשבון).
 * שני סוגי קודים על אותו נתיב:
 * - קוד קצר (6-12 תווים) - נשמר ב-Supabase ע"י /api/share; מאחזרים את
 *   ה-payload ומפענחים אותו.
 * - קוד inline ארוך (v1) - הטיול מקודד בתוך ה-URL עצמו; ממשיך לעבוד
 *   גם בלי backend וגם עבור קישורים ישנים.
 * בשני המקרים decodeTripShare מאמת מול הדאטה האוצרת - רק מקומות
 * אמיתיים מוצגים.
 */

const resolveSharedTrip = cache(async (code: string): Promise<SharedTrip | null> => {
  if (/^[a-zA-Z0-9]{6,12}$/.test(code)) {
    const payload = await getSharedPayload(code);
    return payload ? decodeTripShare(payload) : null;
  }
  return decodeTripShare(code);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const shared = await resolveSharedTrip(code);
  if (!shared) return { title: 'טיול משותף | טיול+' };
  const cities = [...new Set(shared.days.map((d) => d.citySlug))]
    .map((s) => destinations.find((x) => x.slug === s)?.name)
    .filter(Boolean)
    .join(' · ');
  const stops = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
  return {
    title: `${shared.name} | טיול+`,
    description: `מסלול של ${shared.days.length} ימים ו-${stops} עצירות ב${cities} - נבנה בטיול+, סוכן הנסיעות החכם.`,
  };
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const shared = await resolveSharedTrip(code);

  if (!shared) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-shell p-10 text-center ring-1 ring-night/10">
        <h1 className="display text-2xl text-night">הקישור הזה לא תקין</h1>
        <p className="mt-2 leading-relaxed text-night/60">
          לא הצלחנו לפתוח את הטיול המשותף - ייתכן שהקישור נחתך בהעתקה או שפג תוקפו.
          בקשו מהשולח לשתף אותו שוב.
        </p>
      </div>
    );
  }

  return <SharedTripView shared={shared} />;
}
