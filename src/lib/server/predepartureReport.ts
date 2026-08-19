/**
 * Server only - builds the "pre-departure check" report.
 *
 * Imported only here and not by a client component: `destinations`/`calendar` are the
 * full catalog (~2MB), and there is no reason for it to reach the browser for this
 * feature - exactly the same consideration as `server/tripStats.ts`.
 *
 * ## What "checked" means here, honestly
 *
 * Both claims - "every place is re-checked" and "the kashrut is re-checked" - are **the
 * same mechanism**: a `Trip` stores only `placeIds`, so every view resolves them against
 * the **live** catalog anyway, not against an old snapshot. This report does exactly that
 * explicitly and on the record, and yes - it does **not** telephone anywhere. Kashrut
 * supervision is presented exactly as written in the catalog, with the same "verify with
 * the venue" caveat that exists everywhere on the site (see `KosherBadge.tsx` and the
 * kashrut policy in CLAUDE.md) - "re-checked" means the information was read again, now,
 * not that it was verified on the ground.
 */

import { destinations } from '@/data/destinations';
import { calendar } from '@/data/calendar';
import type { Place } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { dayDate } from '@/lib/trip/dates';
import { datedLabel, dayRangeLabel, impactLabel, matchTripCalendar } from '@/lib/trip/dateWindows';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import { KASHRUT_DIET_LABEL, describeCertifications, kashrutCaveat } from '@/lib/kashrut';
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
  const k = place.kashrut;
  if (status === 'kosher') {
    // The report names the body and carries the record's own caveat, which is
    // specific to what we actually know rather than one generic sentence for
    // every place. `kashrutCaveat` never returns empty, so the fact can never
    // be printed bare.
    const bodies = describeCertifications(k);
    const head = bodies
      ? `השגחה כפי שדווחה: ${bodies}`
      : 'מסומן ככשר בקטלוג שלנו, בלי שם גוף משגיח רשום';
    const diet = k?.diet ? ` · ${KASHRUT_DIET_LABEL[k.diet]}` : '';
    const arrangement = k?.arrangement ? ` · ${k.arrangement}` : '';
    return `${head}${diet}${arrangement}. ${kashrutCaveat(k)}`;
  }
  if (status === 'not-kosher') {
    return `המקום מסומן אצלנו כלא כשר.${place.kosherNote ? ` ${place.kosherNote}` : ''}`;
  }
  return 'כשרות המקום לא ידועה בנתונים שלנו - אין להניח שהוא כשר בלי לבדוק.';
}

/**
 * Day order is valid - **exactly the same idea as `routeSummary` in `trip/agent.ts`**,
 * kept independent on purpose (with no dependency on the agent file): a run of cities,
 * and returning to a city already left (except a loop back to the starting city at the
 * end of the trip) is a zigzag.
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
          supervision: describeCertifications(place.kashrut) || undefined,
          lastChecked: place.kashrut?.provenance.checked ?? null,
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
