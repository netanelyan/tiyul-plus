'use client';

import { useState } from 'react';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import PanelSection from '@/components/PanelSection';
import KosherBadge from '@/components/KosherBadge';
import { formatHebrewDate } from '@/lib/trip/dates';
import { shabbatRowsFor, type ShabbatRow } from '@/lib/trip/shabbatRows';
import { inHe } from '@/lib/hebrew';

/**
 * "Shabbat and kashrut on the trip" - the package whose goal is to be the
 * feature no competitor has: the catalog's kosher layer + Shabbat times
 * computed for this trip's exact dates and locations.
 *
 * ## Three rules this panel lives by
 *
 * 1. **Kashrut is opt-in, never an assumption.** The panel renders only when
 *    the kosher preference is switched on for the trip - the same principle
 *    `filterKosherUnlessOptedIn` enforces on the agent side.
 * 2. **Times are a computation, not a halachic ruling.** Sunset at a
 *    coordinate and date is astronomy (lib/zmanim.ts); candle lighting 18
 *    minutes before and havdalah at 8.5 degrees are common customs - and
 *    that is stated on screen, not hidden.
 * 3. **No clock - no time.** A city with no mapped timezone
 *    (countryTimezones) does not get an estimated time that could be off by
 *    an hour; it gets an honest sentence saying to check a local calendar.
 */

export default function ShabbatKosherPanel({
  trip,
  destOf,
}: {
  trip: Trip;
  destOf: (slug: string) => Destination | undefined;
}) {
  const [open, setOpen] = useState(false);

  // Kashrut is opt-in - without the preference, the panel does not exist at all
  if (trip.preferences?.kosher !== true) return null;

  /* ---------- Shabbat times: the computation shared with the trip book (shabbatRows.ts) ---------- */
  const shabbatot: ShabbatRow[] = shabbatRowsFor(trip, destOf);

  /* ---------- Kosher places in the trip's cities - from the catalog only ---------- */
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

  // No content at all (no Shabbatot in the range and no kosher data for the
  // cities) - don't show an empty panel that promises something we don't have
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
            {/* No ✡️ on purpose: the glyph is reserved for the shared kosher
                components only (designConsistency.test.ts) - the status
                itself is rendered below through KosherBadge, like everywhere
                else on the site */}
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
