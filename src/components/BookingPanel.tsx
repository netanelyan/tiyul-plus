'use client';

import { useMemo, useState } from 'react';
import {
  BOOKING_STATUS_LABELS,
  bookingIsAffiliate,
  bookingProviders,
  buildBookingUrl,
} from '@/lib/booking';
import type { BookingKind, BookingStatus, Trip, TripPreferences } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { OFFLINE_HINT } from '@/lib/offline/online';

/**
 * "מה עוד חסר לטיול" - שכבת ההזמנות בתוך תצוגת הטיול.
 *
 * הפאנל הוא הצד ה*דטרמיניסטי* של הפיצ׳ר: הסטטוסים מגיעים מ-
 * `Trip.preferences.booking` (הסוכן שומר אותם, או שהמשתמש לוחץ כאן),
 * והקישורים מורכבים תמיד ב-`src/lib/booking.ts`. שום כתובת לא מגיעה
 * מהמודל, ולכן אי אפשר להמציא קישור, מחיר או זמינות.
 */

const STATUS_ORDER: BookingStatus[] = ['have', 'need', 'not_needed'];

export default function BookingPanel({
  trip,
  destinations,
  onSetPreferences,
  offline = false,
}: {
  trip: Trip;
  destinations: Destination[];
  onSetPreferences: (patch: Partial<TripPreferences>) => void;
  /**
   * בלי רשת הפאנל נשאר **קריא** - מה כבר סגור ומה עוד חסר הוא בדיוק
   * מה שרוצים לראות בשטח - אבל אי אפשר לשנות סטטוס (זו כתיבה לטיול)
   * ואי אפשר לצאת לאתר של ספק. הקישור לא מוסתר: הוא נראה מושבת ואומר
   * למה, כדי שלא ייראה כאילו הפיצ׳ר נשבר.
   */
  offline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const booking = trip.preferences?.booking ?? {};

  /**
   * ערי הטיול, לפי הסדר. בטיול רב-ערים חיפוש לפי העיר הראשונה בלבד
   * מחזיר מלונות במקום הלא נכון, ולכן המטייל בוחר כאן לאיזו עיר לחפש.
   * השם הלטיני מגיע מהדאטה שלנו; nameLocal נכתב לעיתים כ-
   * "Vienna / Wien" - שולחים רק את החלק הראשון, כי מחרוזת עם לוכסן
   * מחזירה תוצאות ריקות אצל הספקים.
   */
  const cities = useMemo(
    () =>
      trip.citySlugs
        .map((slug) => {
          const dest = destinations.find((d) => d.slug === slug);
          if (!dest) return null;
          return {
            slug,
            label: dest.name,
            query: (dest.nameLocal ?? dest.name).split('/')[0].trim(),
          };
        })
        .filter((c): c is { slug: string; label: string; query: string } => Boolean(c)),
    [trip.citySlugs, destinations],
  );

  const [citySlug, setCitySlug] = useState<string | null>(null);
  const active = cities.find((c) => c.slug === citySlug) ?? cities[0];
  const query = active?.query ?? '';

  const setStatus = (kind: BookingKind, status: BookingStatus) => {
    const next = { ...booking };
    // לחיצה חוזרת על אותו סטטוס מבטלת אותו (חזרה ל"עוד לא נשאל")
    if (next[kind] === status) delete next[kind];
    else next[kind] = status;
    onSetPreferences({ booking: next });
  };

  const openCount = bookingProviders.filter((p) => booking[p.kind] === 'need').length;

  return (
    <section className="mt-5 print:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl bg-shell px-4 py-3 text-start text-sm font-bold text-night ring-1 ring-night/10 transition hover:ring-night/20"
      >
        <span aria-hidden>🧳</span>
        מה עוד חסר לטיול
        {openCount > 0 && (
          <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-xs font-bold text-sunset-deep">
            {openCount} פתוחים
          </span>
        )}
        <span className={`ms-auto text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <div className={open ? 'mt-2 block' : 'hidden'}>
        {cities.length > 1 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-xs font-semibold text-night/50">חיפוש עבור</span>
            {cities.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCitySlug(c.slug)}
                aria-pressed={c.slug === active?.slug}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  c.slug === active?.slug
                    ? 'bg-night text-cream'
                    : 'bg-night/[0.05] text-night/60 hover:bg-night/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {bookingProviders.map((p) => {
            const status = booking[p.kind];
            const url = buildBookingUrl(p.kind, query);
            const affiliate = bookingIsAffiliate(p.kind);
            const muted = status === 'not_needed' || status === 'have';
            return (
              <article
                key={p.kind}
                className={`rounded-2xl bg-shell p-3 ring-1 ring-night/10 transition ${
                  muted ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">
                    {p.emoji}
                  </span>
                  <h3 className="text-sm font-bold text-night">{p.title}</h3>
                  {status && (
                    <span className="ms-auto rounded-full bg-night/[0.06] px-2 py-0.5 text-[11px] font-semibold text-night/60">
                      {BOOKING_STATUS_LABELS[status]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{p.blurb}</p>

                {/* סימון ידני - אותו שדה בדיוק שהסוכן כותב אליו */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(p.kind, s)}
                      aria-pressed={status === s}
                      disabled={offline}
                      title={offline ? OFFLINE_HINT : undefined}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        status === s
                          ? 'bg-sunset text-cream'
                          : 'bg-night/[0.05] text-night/60 enabled:hover:bg-night/10'
                      }`}
                    >
                      {BOOKING_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                {offline && url ? (
                  <p className="mt-2 rounded-xl bg-night/[0.04] px-3 py-2 text-center text-xs font-semibold text-night/45">
                    {p.cta} · דורש חיבור
                  </p>
                ) : url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel={`noopener noreferrer nofollow${affiliate ? ' sponsored' : ''}`}
                    className="mt-2 flex items-center justify-center rounded-xl bg-night px-3 py-2 text-xs font-bold text-cream transition hover:bg-night/85"
                  >
                    {p.cta}
                    {p.provider ? ` · ${p.provider}` : ''}
                  </a>
                ) : (
                  <p className="mt-2 rounded-xl bg-night/[0.04] px-3 py-2 text-center text-xs font-semibold text-night/45">
                    בקרוב
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {/* גילוי נאות - נכון להיום אין שום קישור שותפים בקוד */}
        <p className="mt-2 px-1 text-[11px] font-medium leading-relaxed text-night/45">
          הקישורים מפנים לאתרי הספקים עצמם. אנחנו לא מזמינים, לא גובים תשלום ולא מחזיקים פרטי
          אשראי - המחיר, הזמינות ותנאי הביטול נקבעים אצל הספק.
        </p>
      </div>
    </section>
  );
}
