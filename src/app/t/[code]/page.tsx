import type { Metadata } from 'next';
import { destinations } from '@/data/destinations';
import { decodeTripShare } from '@/lib/trip/share';
import SharedTripView from './SharedTripView';

/**
 * /t/<code> - צפייה בטיול משותף, לקריאה בלבד, לכל אחד (בלי חשבון).
 * הקוד מפוענח ומאומת מול הדאטה האוצרת בצד השרת - רק מקומות אמיתיים
 * מוצגים. כפתור "שמירה אצלי" מייבא עותק ל"טיולים שלי" (localStorage,
 * ובעתיד - חשבון המשתמש).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const shared = decodeTripShare(code);
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
  const shared = decodeTripShare(code);

  if (!shared) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-shell p-10 text-center ring-1 ring-night/10">
        <h1 className="display text-2xl text-night">הקישור הזה לא תקין</h1>
        <p className="mt-2 leading-relaxed text-night/60">
          לא הצלחנו לפתוח את הטיול המשותף - ייתכן שהקישור נחתך בהעתקה. בקשו מהשולח
          לשתף אותו שוב.
        </p>
      </div>
    );
  }

  return <SharedTripView shared={shared} />;
}
