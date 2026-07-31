import type { Metadata } from 'next';
import { cache } from 'react';
import { destinations } from '@/data/destinations';
import type { SharedTrip } from '@/lib/trip/share';
import { decodeTripShare } from '@/lib/server/shareDecode';
import { getSharedPayload } from '@/lib/trip/shareStore';
import SharedTripView from './SharedTripView';
import { daysHe } from '@/lib/duration';

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
  const title = `${shared.name} | טיול+`;
  const description = `מסלול של ${daysHe(shared.days.length)} ו-${stops} עצירות ב${cities} - נבנה בטיול+, סוכן הנסיעות החכם.`;
  // openGraph נכתב במפורש ולא בהסתמכות על ה-layout: מטא-דאטה ב-Next
  // מתמזגת לפי שדה, כך ש-title/description כאן **לא** מחלחלים לתוך
  // openGraph של האב - והכרטיס בוואטסאפ היה מציג את שם האתר הגנרי במקום
  // את שם הטיול. הקישור הזה הוא בדיוק מה שנשלח בוואטסאפ, אז זה השדה
  // שהכי חשוב שיהיה מדויק.
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      locale: 'he_IL',
      siteName: 'טיול+',
      title,
      description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'טיול+' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
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

  // רק הערים של הטיול הזה יורדות ללקוח, לא הקטלוג
  const citySlugs = [...new Set(shared.days.map((d) => d.citySlug))];
  const cityData = destinations.filter((d) => citySlugs.includes(d.slug));

  return <SharedTripView shared={shared} cityData={cityData} />;
}
