/**
 * שרת בלבד - בונה את הדוח של "בדיקה לפני הנסיעה".
 *
 * מיובא רק כאן ולא מרכיב לקוח: `destinations`/`calendar` הם הקטלוג
 * המלא (~2MB), ואין שום סיבה שהוא יגיע לדפדפן בשביל הפיצ'ר הזה - אותו
 * שיקול בדיוק כמו `server/tripStats.ts`.
 *
 * ## מה "נבדק" אומר כאן, בכנות
 *
 * שני הדברים - "כל מקום נבדק מחדש" ו"הכשרות נבדקת מחדש" - הם **אותו
 * מנגנון**: `Trip` שומר רק `placeIds`, ולכן כל תצוגה ממילא פותרת אותם
 * מול הקטלוג **החי**, לא מול תמונת מצב ישנה. הדוח הזה עושה בדיוק את
 * זה בצורה מפורשת ומתועדת, וכן - **לא** מתקשר לאף מקום. השגחת כשרות
 * מוצגת בדיוק כמו שהיא כתובה בקטלוג, עם אותו כיסוי "לוודא מול המקום"
 * שקיים בכל האתר (ראו `KosherBadge.tsx` ומדיניות הכשרות ב-CLAUDE.md) -
 * "נבדק מחדש" פירושו שהמידע נקרא שוב, עכשיו, ולא שהוא אומת בשטח.
 */

import { destinations } from '@/data/destinations';
import { calendar } from '@/data/calendar';
import type { Place } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { dayDate } from '@/lib/trip/dates';
import { datedLabel, dayRangeLabel, impactLabel, matchTripCalendar } from '@/lib/trip/dateWindows';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import type {
  PreDepartureReport,
  ReportCalendarFinding,
  ReportItineraryDay,
  ReportKosherNote,
  ReportPlaceFlag,
} from '@/lib/predeparture';

const PLACE_OF = new Map(destinations.flatMap((d) => d.places.map((p) => [p.id, p] as const)));
const DEST_OF = new Map(destinations.map((d) => [d.slug, d]));

function kosherNoteFor(place: Place): string {
  const status = kosherStatusOf(place);
  const v = place.kosherVerification;
  if (status === 'kosher') {
    const supervision = v?.supervision;
    const checked = v?.lastChecked && v.lastChecked !== 'pending-review' ? v.lastChecked : null;
    if (!supervision) return 'מסומן ככשר בקטלוג שלנו, בלי פרטי השגחה רשומים. לוודא מול המקום.';
    return `השגחה כפי שדווחה: ${supervision}${checked ? ` · נרשם לאחרונה ב-${checked}` : ''}. הנתון מבוסס על דיווח ולא על אימות טלפוני שלנו - תמיד לוודא מול המקום לפני ההגעה.`;
  }
  if (status === 'not-kosher') {
    return `המקום מסומן אצלנו כלא כשר.${place.kosherNote ? ` ${place.kosherNote}` : ''}`;
  }
  return 'כשרות המקום לא ידועה בנתונים שלנו - אין להניח שהוא כשר בלי לבדוק.';
}

/**
 * סדר הימים תקין - **אותו רעיון בדיוק כמו `routeSummary` ב-`trip/agent.ts`**,
 * עצמאי מכוונה (בלי תלות בקובץ הסוכן): רצף ערים, ומעבר חוזר לעיר
 * שכבר עזבו (חוץ מלולאה שחוזרת לעיר ההתחלה בסוף הטיול) הוא זגזוג.
 */
function checkRouteOrder(citySlugsInOrder: string[]): { ok: boolean; note?: string } {
  const seq: string[] = [];
  for (const c of citySlugsInOrder) {
    if (seq[seq.length - 1] !== c) seq.push(c);
  }
  if (seq.length <= 1) return { ok: true };

  const first = seq[0];
  const seen = new Set<string>();
  const revisited = new Set<string>();
  seq.forEach((c, i) => {
    const isLast = i === seq.length - 1;
    if (seen.has(c) && !(c === first && isLast)) revisited.add(c);
    seen.add(c);
  });
  if (revisited.size === 0) return { ok: true };

  const names = [...revisited].map((slug) => DEST_OF.get(slug)?.name ?? slug);
  return {
    ok: false,
    note: `סדר הימים חוזר על עצמו: ${names.join(', ')} מופיעה יותר מפעם אחת שלא ברצף - זה זגזוג שמבזבז שעות נסיעה. כדאי לבדוק את סדר הימים לפני היציאה.`,
  };
}

export function buildPreDepartureReport(trip: Trip): PreDepartureReport {
  const placesFlagged: ReportPlaceFlag[] = [];
  const kosherNotes: ReportKosherNote[] = [];
  const itinerary: ReportItineraryDay[] = [];
  let placesChecked = 0;

  trip.days.forEach((day, index) => {
    const dest = DEST_OF.get(day.citySlug);
    const dayNumber = index + 1;
    const stops: ReportItineraryDay['stops'] = [];

    for (const placeId of day.placeIds) {
      placesChecked += 1;
      const place = PLACE_OF.get(placeId);
      if (!place) {
        placesFlagged.push({ dayNumber, placeId, reason: 'not-in-catalog' });
        stops.push({ name: placeId, category: 'attraction', unknown: true });
        continue;
      }
      stops.push({ name: place.name, category: place.category, mustSee: place.mustSee });
      if (isEating(place.category) || isKosher(place.category)) {
        kosherNotes.push({
          dayNumber,
          placeId,
          name: place.name,
          status: kosherStatusOf(place),
          supervision: place.kosherVerification?.supervision,
          lastChecked: place.kosherVerification?.lastChecked,
          note: kosherNoteFor(place),
        });
      }
    }

    itinerary.push({
      dayNumber,
      cityName: dest?.name ?? day.citySlug,
      date: dayDate(trip, index) ?? undefined,
      stops,
    });
  });

  const cities = trip.citySlugs
    .map((slug) => ({ slug, countrySlug: DEST_OF.get(slug)?.countrySlug ?? '' }))
    .filter((c) => c.countrySlug);
  const { dated } = matchTripCalendar(trip, calendar, cities);
  const calendarFindings: ReportCalendarFinding[] = dated.map((m) => ({
    name: m.entry.name,
    impact: impactLabel(m.entry),
    note: m.entry.note,
    dates: `${datedLabel(m)} · ${dayRangeLabel(m.dayNumbers)} בטיול`,
    dayNumbers: m.dayNumbers,
    sourceUrl: m.entry.source.url,
  }));

  const route = checkRouteOrder(trip.days.map((d) => d.citySlug));

  return {
    generatedAt: new Date().toISOString(),
    tripName: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    placesChecked,
    placesFlagged,
    kosherChecked: kosherNotes.length,
    kosherNotes,
    calendarFindings,
    routeOk: route.ok,
    routeNote: route.note,
    itinerary,
  };
}
