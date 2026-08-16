'use client';

import { useState } from 'react';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import PanelSection from '@/components/PanelSection';
import KosherBadge from '@/components/KosherBadge';
import { dayDate, formatHebrewDate } from '@/lib/trip/dates';
import { shabbatTimesFor, weekdayOf } from '@/lib/zmanim';
import { formatInZone, timezoneFor } from '@/lib/countryTimezones';
import { inHe } from '@/lib/hebrew';

/**
 * "שבת וכשרות בטיול" - החבילה שהמטרה שלה היא להיות הפיצ׳ר שאין לאף
 * מתחרה: שכבת הכשרות של הקטלוג + זמני שבת מחושבים לתאריכים ולמיקומים
 * המדויקים של הטיול הזה.
 *
 * ## שלושה כללים שהפאנל הזה חי לפיהם
 *
 * 1. **כשרות היא opt-in, לעולם לא הנחה.** הפאנל מרונדר רק כשהעדפת
 *    הכשרות דלוקה על הטיול - אותו עיקרון שאוכף `filterKosherUnlessOptedIn`
 *    בצד הסוכן.
 * 2. **זמנים הם חישוב, לא פסיקה.** שקיעה בקואורדינטה ותאריך היא
 *    אסטרונומיה (lib/zmanim.ts); הדלקת נרות 18 דק׳ לפני והבדלה ב-8.5
 *    מעלות הם מנהגים נפוצים - וזה נאמר על המסך, לא מוסתר.
 * 3. **אין שעון - אין זמן.** עיר שאין לה אזור זמן ממופה
 *    (countryTimezones) לא מקבלת זמן משוער שעלול לטעות בשעה; היא
 *    מקבלת משפט כן שאומר לבדוק לוח מקומי.
 */

interface ShabbatRow {
  fridayIso: string;
  dayNumber: number; // היום בטיול שבו חלה שבת (שישי)
  cityName: string;
  candles: string | null; // שעה מקומית, או null כשאין אזור זמן
  havdalah: string | null;
}

export default function ShabbatKosherPanel({
  trip,
  destOf,
}: {
  trip: Trip;
  destOf: (slug: string) => Destination | undefined;
}) {
  const [open, setOpen] = useState(false);

  // כשרות היא opt-in - בלי ההעדפה, הפאנל לא קיים בכלל
  if (trip.preferences?.kosher !== true) return null;

  /* ---------- זמני שבת: כל שישי שנופל בתוך ימי הטיול ---------- */
  const shabbatot: ShabbatRow[] = [];
  if (trip.startDate) {
    trip.days.forEach((d, i) => {
      const iso = dayDate(trip, i);
      if (!iso || weekdayOf(iso) !== 5) return;
      const dest = destOf(d.citySlug);
      if (!dest) return;
      const times = shabbatTimesFor(iso, dest.center.lat, dest.center.lng);
      if (!times) return;
      const zone = timezoneFor(dest.countrySlug, dest.center.lng);
      shabbatot.push({
        fridayIso: iso,
        dayNumber: i + 1,
        cityName: dest.name,
        candles: zone ? formatInZone(times.candles, zone) : null,
        havdalah: zone ? formatInZone(times.havdalah, zone) : null,
      });
    });
  }

  /* ---------- מקומות כשרים בערי הטיול - מהקטלוג בלבד ---------- */
  const citySlugs = [...new Set([...trip.citySlugs, ...trip.days.map((d) => d.citySlug)])];
  const kosherByCity = citySlugs
    .map((slug) => {
      const dest = destOf(slug);
      if (!dest) return null;
      const places = dest.places.filter((p) => p.category.startsWith('kosher'));
      const overview = dest.practical?.kosherOverview;
      if (places.length === 0 && !overview) return null;
      return { dest, places, overview };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // אין תוכן בכלל (אין שבתות בטווח ואין דאטת כשרות לערים) - לא מציגים
  // פאנל ריק שמבטיח דבר שאין לנו
  if (shabbatot.length === 0 && kosherByCity.length === 0) return null;

  const badge = (
    <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-[11px] font-bold text-sunset-deep">
      {shabbatot.length > 0 ? `${shabbatot.length} שבתות בטיול` : 'מהקטלוג שלנו'}
    </span>
  );

  return (
    <PanelSection
      panelKey="shabbat-kosher"
      icon="🕯️"
      title="שבת וכשרות בטיול"
      ariaLabel="שבת וכשרות בטיול"
      badge={badge}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="space-y-3">
        {shabbatot.length > 0 && (
          <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">🕯️ זמני שבת במסלול שלכם</p>
            <ul className="mt-2 space-y-2">
              {shabbatot.map((s) => (
                <li key={s.fridayIso} className="rounded-xl bg-cream p-3 text-sm">
                  <p className="font-bold text-night">
                    שבת {inHe(s.cityName)} · יום {s.dayNumber} בטיול ·{' '}
                    {formatHebrewDate(s.fridayIso)}
                  </p>
                  {s.candles && s.havdalah ? (
                    <p className="mt-1 font-semibold text-night/70">
                      הדלקת נרות {s.candles} · צאת השבת {s.havdalah}
                      <span className="ms-1.5 text-xs font-medium text-night/45">
                        (שעון מקומי)
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-night/55">
                      לא הצלחנו לקבוע שעון מקומי אמין לעיר הזו - בדקו לוח זמנים מקומי לפני
                      שבת.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-night/45">
              מחושב אסטרונומית לקואורדינטות של העיר: הדלקת נרות 18 דק׳ לפני השקיעה, צאת
              השבת לפי 8.5 מעלות - מנהגים משתנים, בדקו עם הרב שלכם או לוח מקומי.
            </p>
          </div>
        )}

        {kosherByCity.map(({ dest, places, overview }) => (
          <div key={dest.slug} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            {/* בלי ✡️ בכוונה: הגליף שמור לרכיבי הכשרות המשותפים בלבד
                (designConsistency.test.ts) - הסטטוס עצמו מרונדר למטה
                דרך KosherBadge, כמו בכל שאר האתר */}
            <p className="text-sm font-bold text-night">כשרות {inHe(dest.name)}</p>
            {overview && (
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-night/60">
                {overview}
              </p>
            )}
            {places.length > 0 && (
              <ul className="mt-2 space-y-2">
                {places.map((p) => (
                  <li key={p.id} className="rounded-xl bg-cream p-3">
                    <p className="text-sm font-bold text-night">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-night/60">
                        {p.description}
                      </p>
                    )}
                    <KosherBadge verification={p.kosherVerification} className="mt-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <p className="text-[11px] font-medium leading-relaxed text-night/40">
          מידע הכשרות נאסף ממקורות ציבוריים ומוצג כפי שדווח - תמיד לוודא מול המקום לפני
          שסומכים עליו.
        </p>
      </div>
    </PanelSection>
  );
}
