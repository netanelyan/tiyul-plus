/**
 * What a trip runs into on Shabbat and chag - per day, computed.
 *
 * Extends `shabbatRows.ts` (which answers only "what time are candles on the
 * Fridays of this trip") to the question a traveller actually has: **which of
 * my days are affected, and what on those days will not work.**
 *
 * ## Everything here is computed, so nothing here is a claim
 *
 * The rest day comes from the civil weekday and from `hebrewCalendar.ts`. The
 * times come from `zmanim.ts`. The walking distances come from coordinates the
 * catalog already holds. None of it is sourced, so none of it can be wrong in
 * the way a fabricated fact is wrong - it can only be wrong in the way
 * arithmetic is wrong, which a test can catch.
 *
 * ## What it does not do
 *
 * It does not tell anyone what they may or may not do. It says "this stop is
 * 3.4 km from your hotel, and on Shabbat that is a walk" and stops there. The
 * one-day/two-day yom tov question is reported, never resolved - see
 * `hebrewCalendar.ts`.
 *
 * It also does not assert that a specific venue is closed. We do not hold
 * opening hours (deliberately - schedules go stale silently and the traveller
 * finds out at a locked gate), so the wording is always about what is *likely*
 * and about checking, never a statement that a door will be shut.
 */
import type { Destination, Place } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { dayDate } from '@/lib/trip/dates';
import { shabbatTimesFor, sunset, weekdayOf } from '@/lib/zmanim';
import { formatInZone, timezoneFor } from '@/lib/countryTimezones';
import { chagimOn, type ChagDay } from '@/lib/hebrewCalendar';
import { haversineKm } from '@/lib/trip/travel';

/** Why a day is a rest day. Both can be true at once - a chag falling on Shabbat. */
export interface RestReason {
  shabbat: boolean;
  chagim: ChagDay[];
}

export interface ShabbatDayPlan {
  dayNumber: number;
  date: string;
  cityName: string;
  citySlug: string;
  /** Rest applies for at least part of this day. */
  isRestDay: boolean;
  reason: RestReason;
  /** Friday: candle lighting. Saturday: null (the Friday row carries it). */
  candles: string | null;
  /** Saturday / the final day of a chag: when it ends. */
  ends: string | null;
  /** Sunset, used for a chag whose start we describe without a candle custom. */
  sunsetLocal: string | null;
  /**
   * Warnings, most severe first. Every one names what to check rather than
   * asserting a closure we cannot know.
   */
  warnings: ShabbatWarning[];
  /** Distances from the traveller's lodging pin, when they have set one. */
  walkFromStay: WalkDistance[];
}

export type ShabbatWarningKind =
  | 'intercity-travel'
  | 'likely-closed'
  | 'far-from-stay'
  | 'no-lodging-pin'
  | 'chag-second-day'
  | 'no-times';

export interface ShabbatWarning {
  kind: ShabbatWarningKind;
  text: string;
}

export interface WalkDistance {
  placeId: string;
  name: string;
  km: number;
  /** Straight-line, so it is always stated as such. Real walking is longer. */
  minutesWalk: number;
}

/**
 * Categories whose venues are usually shut on a rest day in a city with a
 * Jewish community, and - far more universally - whose whole point requires a
 * transaction. Deliberately not a claim about any specific venue.
 */
const LIKELY_SHUT: ReadonlySet<Place['category']> = new Set([
  'museum',
  'shopping',
  'market',
  'kosher-market',
  'kosher-food',
  'food',
  'cafe',
]);

/** Straight-line km a person covers in an hour, walking. */
const WALK_KM_PER_HOUR = 4.5;

/** Beyond this, "you would be walking there" stops being a detail. */
const FAR_KM = 2.5;

export function shabbatPlanFor(
  trip: Trip,
  destOf: (slug: string) => Destination | undefined,
  placeOf: (id: string) => Place | undefined,
): ShabbatDayPlan[] {
  if (!trip.startDate) return [];

  const out: ShabbatDayPlan[] = [];

  trip.days.forEach((day, i) => {
    const date = dayDate(trip, i);
    if (!date) return;

    const dow = weekdayOf(date);
    const chagim = chagimOn(date);
    const restingChagim = chagim.filter((c) => c.restsLikeShabbat);
    const isShabbat = dow === 6;
    const isRestDay = isShabbat || restingChagim.length > 0;

    // Friday evening matters too - candles are before sunset, so the last part
    // of Friday is already constrained.
    const isErev = dow === 5 || chagimOn(nextIso(date)).some((c) => c.restsLikeShabbat);
    if (!isRestDay && !isErev) return;

    const dest = destOf(day.citySlug);
    if (!dest) return;

    const zone = timezoneFor(dest.countrySlug, dest.center.lng);
    const times = shabbatTimesFor(date, dest.center.lat, dest.center.lng);
    const ss = sunset(date, dest.center.lat, dest.center.lng);

    const warnings: ShabbatWarning[] = [];

    if (!zone) {
      warnings.push({
        kind: 'no-times',
        text: `אין לנו אזור זמן מאומת ל${dest.name}, ולכן לא נציג שעות. אל תסתמכו על שעון ישראל - לוודא מקומית.`,
      });
    }

    // --- inter-city travel on a rest day ------------------------------------
    const prev = i > 0 ? trip.days[i - 1] : null;
    const next = i + 1 < trip.days.length ? trip.days[i + 1] : null;
    if (isRestDay && prev && prev.citySlug !== day.citySlug) {
      warnings.push({
        kind: 'intercity-travel',
        text: `היום הזה מתחיל בעיר אחרת מיום ${i} - מעבר בין ערים ביום מנוחה. מי ששומר שבת וחג לא נוסע ביום הזה, וכדאי להזיז את המעבר.`,
      });
    }
    if (isRestDay && next && next.citySlug !== day.citySlug) {
      warnings.push({
        kind: 'intercity-travel',
        text: `המעבר לעיר הבאה מתוכנן בסמוך ליום מנוחה - לוודא שהנסיעה עצמה לא נופלת בתוכו.`,
      });
    }

    // --- second day of yom tov, reported and not decided ---------------------
    const second = chagim.filter((c) => c.diasporaOnly);
    if (second.length) {
      warnings.push({
        kind: 'chag-second-day',
        text: `${second.map((c) => c.name).join(', ')} - יום טוב שני של גלויות. יש ישראלים בחו״ל שנוהגים בו כיום טוב מלא ויש שלא; זו הכרעה אישית ואנחנו רק מציינים את התאריך.`,
      });
    }

    // --- what is likely shut -------------------------------------------------
    if (isRestDay) {
      const shut = day.placeIds
        .map((id) => placeOf(id))
        .filter((p): p is Place => Boolean(p) && LIKELY_SHUT.has(p!.category));
      if (shut.length) {
        warnings.push({
          kind: 'likely-closed',
          text: `${shut.length} עצירות ביום הזה הן מוזיאונים, שווקים, חנויות או מקומות אוכל (${shut
            .slice(0, 3)
            .map((p) => p.name)
            .join(', ')}${shut.length > 3 ? ' ועוד' : ''}). בחלק מהיעדים הם סגורים או פועלים אחרת ביום מנוחה - לבדוק מול כל מקום.`,
        });
      }
    }

    // --- walking distance from the lodging pin -------------------------------
    const walkFromStay: WalkDistance[] = [];
    if (isRestDay) {
      const stay = lodgingPin(trip, day.citySlug);
      if (stay) {
        for (const id of day.placeIds) {
          const p = placeOf(id);
          if (!p) continue;
          const km = haversineKm(stay, p);
          walkFromStay.push({
            placeId: p.id,
            name: p.name,
            km: Math.round(km * 10) / 10,
            minutesWalk: Math.round((km / WALK_KM_PER_HOUR) * 60),
          });
        }
        walkFromStay.sort((a, b) => b.km - a.km);
        const far = walkFromStay.filter((w) => w.km > FAR_KM);
        if (far.length) {
          warnings.push({
            kind: 'far-from-stay',
            text: `${far.length} עצירות רחוקות מהלינה - הרחוקה ביותר ${far[0].name}, ${far[0].km} ק״מ אוויריים (כ-${far[0].minutesWalk} דקות הליכה לפחות, בפועל יותר). מי שלא נוסע ביום מנוחה יגיע לשם ברגל בלבד.`,
          });
        }
      } else if (day.placeIds.length > 0) {
        warnings.push({
          kind: 'no-lodging-pin',
          text: 'לא סימנתם לינה על המפה, ולכן אי אפשר לחשב מרחקי הליכה ליום המנוחה. הוספת סיכת לינה תיתן את המרחק לכל עצירה.',
        });
      }
    }

    out.push({
      dayNumber: i + 1,
      date,
      cityName: dest.name,
      citySlug: day.citySlug,
      isRestDay,
      reason: { shabbat: isShabbat || dow === 5, chagim },
      candles: times && zone ? formatInZone(times.candles, zone) : null,
      ends: times && zone && dow === 6 ? formatInZone(times.havdalah, zone) : null,
      sunsetLocal: ss && zone ? formatInZone(ss, zone) : null,
      warnings,
      walkFromStay,
    });
  });

  return out;
}

/**
 * The traveller's own lodging pin **for the city of that day**.
 *
 * Two rules, and both matter more here than almost anywhere else on the site:
 *
 *  - Only a pin whose location was actually resolved is used. An unlocated pin
 *    would put every walking distance against a guessed point, and a wrong
 *    distance on a Shabbat day is worse than no distance at all.
 *  - The pin must belong to that day's city, or carry no city at all (a
 *    single-city trip, where the pin is unambiguous). Measuring a Bratislava
 *    day against a Vienna hotel would return a confident number that is
 *    hundreds of kilometres wrong - exactly the kind of plausible-looking
 *    wrong value this project keeps refusing to ship.
 */
function lodgingPin(trip: Trip, citySlug: string): { lat: number; lng: number } | null {
  const located = (trip.pins ?? []).filter(
    (p) => p.kind === 'stay' && typeof p.lat === 'number' && typeof p.lng === 'number',
  );
  const pin =
    located.find((p) => p.citySlug === citySlug) ??
    // Only fall back to a city-less pin when there is exactly one city in the
    // trip. With several, a pin that does not say which city it belongs to
    // cannot be assumed to be this one.
    (trip.citySlugs.length === 1 ? located.find((p) => !p.citySlug) : undefined);
  return pin ? { lat: pin.lat as number, lng: pin.lng as number } : null;
}

function nextIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * The calculation method, stated wherever a time is shown.
 *
 * Customs genuinely differ - 18, 20, 22 or 40 minutes before sunset for
 * candles; 8.5 degrees, 42 minutes or Rabbeinu Tam for the end of Shabbat -
 * and a single displayed number hides that. Naming the method converts an
 * apparent ruling back into what it is: one common custom, computed.
 */
export const ZMANIM_METHOD_HE =
  'השעות מחושבות אסטרונומית מהקואורדינטות של העיר: הדלקת נרות 18 דקות לפני השקיעה, וצאת השבת ב-8.5 מעלות מתחת לאופק. אלה מנהגים רווחים ולא היחידים - יש קהילות ומשפחות שנוהגות אחרת. לוודא מול הקהילה המקומית או מול הרב שלכם.';
