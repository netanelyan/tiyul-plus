'use client';

import { useMemo, useState } from 'react';
import {
  BOOKING_STATUS_LABELS,
  bookingIsAffiliate,
  bookingIsPerCity,
  bookingProviders,
  buildBookingUrl,
} from '@/lib/booking';
import type { BookingKind, BookingStatus, Trip, TripPreferences } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { OFFLINE_HINT } from '@/lib/offline/online';
import PanelSection from '@/components/PanelSection';
import { inHe } from '@/lib/hebrew';
import {
  bookingStatusOf,
  citiesNeeding,
  openBookingCount,
  toggleBookingStatus,
} from '@/lib/trip/bookingStatus';

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

  /**
   * העיר הנבחרת **לכל סוג בנפרד**, ולא לפאנל כולו.
   *
   * הבורר היה קודם אחד, מעל כל הכרטיסים, והוא הסתיר את הבעיה האמיתית:
   * הוא החליף רק את *יעד החיפוש*, בזמן שהסטטוס נשמר לטיול כולו - כך
   * שלחיצה על "כבר סגור" בברטיסלבה סימנה גם את וינה. עכשיו הבורר יושב
   * בתוך הכרטיס שהוא שייך לו, והוא מחליף גם את החיפוש וגם את הסטטוס.
   */
  const [cityByKind, setCityByKind] = useState<Partial<Record<BookingKind, string>>>({});
  const cityFor = (kind: BookingKind) => cityByKind[kind] ?? cities[0]?.slug ?? '';

  const setStatus = (kind: BookingKind, status: BookingStatus, citySlug?: string) => {
    onSetPreferences(
      toggleBookingStatus(trip.preferences, kind, status, {
        citySlug,
        citySlugs: trip.citySlugs,
      }),
    );
  };

  const openCount = openBookingCount(trip);

  return (
    <PanelSection
      panelKey="booking"
      icon="🧳"
      title="מה עוד חסר לטיול"
      className="print:hidden"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      badge={
        openCount > 0 ? (
          <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-xs font-bold text-sunset-deep">
            {openCount} פתוחים
          </span>
        ) : undefined
      }
    >
      <>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {bookingProviders.map((p) => {
            const perCity = bookingIsPerCity(p.kind);
            const slug = perCity ? cityFor(p.kind) : undefined;
            const city = cities.find((c) => c.slug === slug);
            const status = bookingStatusOf(trip.preferences, p.kind, slug);
            const url = buildBookingUrl(p.kind, perCity ? (city?.query ?? '') : '');
            const affiliate = bookingIsAffiliate(p.kind);
            const muted = status === 'not_needed' || status === 'have';
            // כמה ערים עוד פתוחות בסוג הזה - התשובה ל"מה נשאר" בלי לפתוח כל אחת
            const needing = perCity ? citiesNeeding(trip, p.kind) : [];
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
                      {/* הסטטוס שייך לעיר, ולכן הוא נאמר יחד איתה */}
                      {perCity && cities.length > 1 && city ? `${city.label}: ` : ''}
                      {BOOKING_STATUS_LABELS[status]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{p.blurb}</p>

                {/*
                  בורר העיר, בתוך הכרטיס שהוא שייך לו. מוצג רק כשיש יותר
                  מעיר אחת - בטיול לעיר אחת הוא היה שורה שאומרת את מה
                  שכבר כתוב בכותרת הטיול.
                */}
                {perCity && cities.length > 1 && (
                  <div
                    role="group"
                    aria-label={`${p.title} - בחירת עיר`}
                    className="mt-2 flex flex-wrap gap-1"
                  >
                    {cities.map((c) => {
                      const st = bookingStatusOf(trip.preferences, p.kind, c.slug);
                      return (
                        <button
                          key={c.slug}
                          onClick={() => setCityByKind((m) => ({ ...m, [p.kind]: c.slug }))}
                          aria-pressed={c.slug === slug}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            c.slug === slug
                              ? 'bg-night text-cream'
                              : 'bg-night/[0.05] text-night/60 hover:bg-night/10'
                          }`}
                        >
                          {c.label}
                          {/*
                            נקודה קטנה על עיר שכבר נענתה. בלעדיה הבורר
                            מסתיר את מה שהוא בא לפתור: אי אפשר לדעת אילו
                            ערים כבר טופלו בלי ללחוץ על כל אחת.
                          */}
                          {st && (
                            <span
                              aria-hidden
                              className={`h-1.5 w-1.5 rounded-full ${
                                st === 'need'
                                  ? 'bg-sunset'
                                  : c.slug === slug
                                    ? 'bg-cream/60'
                                    : 'bg-night/30'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* סימון ידני - אותו שדה בדיוק שהסוכן כותב אליו */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(p.kind, s, slug)}
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

                {needing.length > 0 && cities.length > 1 && (
                  <p className="mt-1.5 text-[11px] font-semibold text-sunset-deep">
                    עוד צריך:{' '}
                    {needing
                      .map((cs) => cities.find((c) => c.slug === cs)?.label ?? cs)
                      .join(', ')}
                  </p>
                )}

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
                    {perCity && cities.length > 1 && city ? ` ${inHe(city.label)}` : ''}
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

        {/*
          גילוי נאות. **חובה, לא אופציונלי** - ולכן הוא מוצג תמיד, גם כל
          עוד אין בסביבה אף מזהה שותפים אמיתי. "עשויים" הוא הנוסח הנכון
          בשני המצבים. המשפט על אי-השפעה על הדירוג הוא הבטחה שהקוד מקיים:
          סדר הכרטיסים הוא סדר הקונפיג, שנקבע לפי מה שמטייל צריך, ואינו
          תלוי בשאלה אם לספק יש מזהה שותפים - יש על זה טסט.
        */}
        <p className="mt-2 px-1 text-[11px] font-medium leading-relaxed text-night/45">
          הקישורים מפנים לאתרי הזמנות חיצוניים, ואנחנו עשויים לקבל עמלה על הזמנה שמתבצעת דרכם. זה לא
          משפיע על מה שאנחנו מציעים או על הסדר שבו. אנחנו לא מזמינים, לא גובים תשלום ולא מחזיקים
          פרטי אשראי - המחיר, הזמינות ותנאי הביטול נקבעים אצל הספק.
        </p>
      </>
    </PanelSection>
  );
}
