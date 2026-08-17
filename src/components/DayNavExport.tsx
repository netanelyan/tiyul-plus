'use client';

import {
  googleMapsLegs,
  isValidNavPoint,
  type NavPoint,
  type TravelMode,
  MAX_POINTS_PER_LEG,
} from '@/lib/trip/mapsExport';
import { trackEvent } from '@/lib/events';

/**
 * "Navigate day N in Google Maps" - the day's stops, in the planned order.
 *
 * Three decisions that are the whole difference between this button and the link that was here before:
 *
 * 1. **It says what it will do before you click** - how many stops, on foot or by car.
 *    A button that opens another app has to be predictable.
 * 2. **A long day is split into legs, visibly.** Google accepts at most nine
 *    waypoints, and the previous version simply lost the excess silently.
 * 3. **The starting point is the lodging, if there is one** - that is what a real day
 *    looks like, and it is stated explicitly that the route starts from the hotel so
 *    it is not a surprising change.
 *
 * Mobile: a full-width button with a real touch height; on iOS and Android the link
 * opens in the Maps app itself. Ordinary RTL - the text is Hebrew and the URL is
 * inside the href.
 */
export default function DayNavExport({
  dayNumber,
  stops,
  start,
  mode,
}: {
  dayNumber: number;
  /** The day's stops, in order */
  stops: NavPoint[];
  /** The lodging in this city, if it has a verified location */
  start?: NavPoint | null;
  mode: TravelMode;
}) {
  const points: NavPoint[] = start ? [start, ...stops] : stops;
  if (points.length === 0) return null;

  /*
    How many points will actually enter the navigation - `googleMapsLegs` silently
    filters out an invalid coordinate (`isValidNavPoint`), and that is exactly this bug
    in a smaller version: "5 points" in the label when only 4 really made it into the
    route. Precisely the same point as placeMapUrl - a link or route that "works" while
    silently omitting a stop is worse than a message that says so openly.
  */
  const excluded = points.length - points.filter(isValidNavPoint).length;
  const legs = googleMapsLegs(points, mode);

  if (legs.length === 0) {
    /*
      Two entirely different situations lead to the same legs.length === 0, and they
      need to be distinguished: a day with only one stop (excluded === 0) is the most
      ordinary state there is - there is nothing to build a route from, and nothing here
      to report. A day where some stop was excluded (excluded > 0) is a real data gap
      that should be seen, not vanish exactly as the button used to vanish.
    */
    if (excluded === 0) return null;
    return (
      <p className="mt-3 text-center text-xs font-medium text-night/40">
        אין עדיין מספיק עצירות עם מיקום מאומת כדי לבנות ניווט ליום הזה
      </p>
    );
  }

  const modeLabel = mode === 'driving' ? 'ברכב' : 'ברגל';
  const navigable = points.length - excluded;
  const summary = `${navigable} נקודות · ${modeLabel}${start ? ' · מתחיל מהלינה' : ''}`;
  const excludedNote =
    excluded > 0
      ? ` · ${excluded} ${excluded === 1 ? 'עצירה אחת לא נכללה' : 'עצירות לא נכללו'} כי אין להן מיקום מאומת`
      : '';

  return (
    <div className="mt-3">
      {legs.length === 1 ? (
        <a
          href={legs[0].url}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent('maps')}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-night/5 px-4 py-2.5 text-center text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night"
        >
          <span aria-hidden>🧭</span> ניווט ליום {dayNumber} ב-Google Maps
        </a>
      ) : (
        <div className="space-y-1.5">
          {legs.map((leg, i) => (
            <a
              key={leg.url}
              href={leg.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('maps')}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-night/5 px-4 py-2.5 text-center text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night"
            >
              <span aria-hidden>🧭</span> ניווט · קטע {i + 1} מתוך {legs.length}
              <span className="font-medium text-night/45">({leg.count} נקודות)</span>
            </a>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-center text-xs font-medium text-night/40">
        {legs.length === 1
          ? `${summary}${excludedNote}`
          : `${summary} · Google Maps מגבילה ${MAX_POINTS_PER_LEG} נקודות בניווט אחד, ולכן היום מחולק לקטעים רצופים${excludedNote}`}
      </p>
    </div>
  );
}
