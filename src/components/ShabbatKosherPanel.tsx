'use client';

import { useState } from 'react';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import PanelSection from '@/components/PanelSection';
import KosherBadge from '@/components/KosherBadge';
import { formatHebrewDate } from '@/lib/trip/dates';
import { shabbatRowsFor, type ShabbatRow } from '@/lib/trip/shabbatRows';
import { shabbatPlanFor, ZMANIM_METHOD_HE } from '@/lib/trip/shabbatPlan';
import { inHe } from '@/lib/hebrew';
import type { Place } from '@/lib/types';

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

  /*
    Opt-in, but on EITHER preference.

    This used to require `kosher === true`, which meant a Shabbat-observant
    traveller who had not ticked the kosher box was shown nothing at all - no
    candle times, no warning that day 4 is Yom Kippur. Those are two different
    preferences and the trip screen already collects both, so the panel now
    opens for either and shows only the half that was asked for: kashrut
    content stays behind `kosher`, Shabbat content behind either.

    Still never on by default. Nothing here is assumed.
  */
  const wantsKosher = trip.preferences?.kosher === true;
  const wantsShabbat = wantsKosher || trip.preferences?.shabbatAware === true;
  if (!wantsKosher && !wantsShabbat) return null;

  /* ---------- Shabbat times: the computation shared with the trip book (shabbatRows.ts) ---------- */
  const shabbatot: ShabbatRow[] = wantsShabbat ? shabbatRowsFor(trip, destOf) : [];

  /* ---------- Day-by-day: which days rest, and what will not work on them ---------- */
  const placeIndex = new Map<string, Place>();
  for (const slug of new Set(trip.days.map((d) => d.citySlug))) {
    for (const p of destOf(slug)?.places ?? []) placeIndex.set(p.id, p);
  }
  const dayPlans = wantsShabbat
    ? shabbatPlanFor(trip, destOf, (id) => placeIndex.get(id))
    : [];
  const restDays = dayPlans.filter((d) => d.isRestDay);
  const allWarnings = dayPlans.flatMap((d) => d.warnings);

  /* ---------- Kosher places in the trip's cities - from the catalog only ---------- */
  const citySlugs = [...new Set([...trip.citySlugs, ...trip.days.map((d) => d.citySlug)])];
  const kosherByCity = wantsKosher
    ? citySlugs
        .map((slug) => {
          const dest = destOf(slug);
          if (!dest) return null;
          const places = dest.places.filter((p) => p.category.startsWith('kosher'));
          const overview = dest.practical?.kosherOverview;
          if (places.length === 0 && !overview) return null;
          return { dest, places, overview };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  // No content at all (no Shabbatot in the range and no kosher data for the
  // cities) - don't show an empty panel that promises something we don't have
  if (shabbatot.length === 0 && kosherByCity.length === 0 && dayPlans.length === 0)
    return null;

  const badge = (
    <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-[11px] font-bold text-sunset-deep">
      {restDays.length > 0
        ? `${restDays.length} ימי מנוחה בטיול`
        : shabbatot.length > 0
          ? `${shabbatot.length} שבתות בטיול`
          : 'מהקטלוג שלנו'}
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
              {ZMANIM_METHOD_HE}
            </p>
          </div>
        )}

        {/*
          The day-by-day view. This is the half that answers the question a
          traveller actually has - "which of my days does this hit, and what
          on them will not work" - rather than only "what time are candles".
        */}
        {dayPlans.length > 0 && (
          <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">📅 ימי מנוחה במסלול</p>
            <ul className="mt-2 space-y-2">
              {dayPlans.map((d) => (
                <li key={d.date} className="rounded-xl bg-cream p-3 text-sm">
                  <p className="font-bold text-night">
                    יום {d.dayNumber} · {formatHebrewDate(d.date)} · {inHe(d.cityName)}
                    {d.isRestDay ? (
                      <span className="ms-1.5 rounded-full bg-sunset/15 px-2 py-0.5 text-[11px] font-bold text-sunset-deep">
                        יום מנוחה
                      </span>
                    ) : (
                      <span className="ms-1.5 rounded-full bg-night/8 px-2 py-0.5 text-[11px] font-bold text-night/60">
                        ערב חג/שבת
                      </span>
                    )}
                  </p>

                  {d.reason.chagim.length > 0 && (
                    <p className="mt-1 text-xs font-bold text-night/75">
                      {d.reason.chagim.map((c) => c.name).join(' · ')}
                      <span className="font-medium text-night/45"> ({d.reason.chagim[0].hebrewDate})</span>
                    </p>
                  )}

                  {(d.candles || d.ends) && (
                    <p className="mt-1 font-semibold text-night/70">
                      {d.candles && <>הדלקת נרות {d.candles}</>}
                      {d.candles && d.ends && ' · '}
                      {d.ends && <>צאת השבת {d.ends}</>}
                      <span className="ms-1.5 text-xs font-medium text-night/45">
                        (שעון מקומי)
                      </span>
                    </p>
                  )}

                  {d.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {d.warnings.map((w) => (
                        <li
                          key={w.kind + w.text.slice(0, 12)}
                          className="rounded-lg bg-night/5 px-2.5 py-1.5 text-xs font-semibold leading-relaxed text-night/70"
                        >
                          {w.kind === 'intercity-travel' ? '🚗 ' : w.kind === 'likely-closed' ? '🔒 ' : w.kind === 'far-from-stay' ? '🚶 ' : 'ℹ️ '}
                          {w.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {d.walkFromStay.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-night/60">
                        מרחקי הליכה מהלינה ({d.walkFromStay.length})
                      </summary>
                      <ul className="mt-1.5 space-y-1">
                        {d.walkFromStay.map((w) => (
                          <li key={w.placeId} className="text-xs font-semibold text-night/65">
                            {w.name} — {w.km} ק״מ אוויריים · כ-{w.minutesWalk} דק׳ הליכה
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-[11px] font-medium text-night/40">
                        מרחק אווירי מחושב מהקואורדינטות. הליכה בפועל ארוכה יותר - הרחוב לא ישר.
                      </p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {allWarnings.length === 0 && (
              <p className="mt-2 text-xs font-semibold text-night/55">
                לא מצאנו התנגשויות במסלול בימים האלה. עדיין כדאי לוודא שעות פתיחה מול כל מקום.
              </p>
            )}
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
                    <KosherBadge kashrut={p.kashrut} className="mt-1.5" />
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
