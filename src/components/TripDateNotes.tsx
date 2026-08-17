'use client';

import { useMemo } from 'react';
import { calendar } from '@/data/calendar';
import {
  NOT_PUBLISHED,
  datedLabel,
  dayRangeLabel,
  impactLabel,
  matchTripCalendar,
  sourceLabel,
} from '@/lib/trip/dateWindows';
import PanelSection from '@/components/PanelSection';
import type { Trip } from '@/lib/trip/types';
import type { CalendarEntry, Destination } from '@/lib/types';

/**
 * "What is happening on your dates" - what the trip's dates land on.
 *
 * ## Three design decisions that are really content decisions
 *
 * 1. **Secondary to the itinerary.** No coloured background, no emphasised ring and
 *    no warning icon. The panel sits below the plan, in the shades of the quiet text
 *    already on the screen. The itinerary is what the traveller came to see.
 * 2. **A closure is information, not an alert.** No yellow triangle and no "attention":
 *    the label says "closures", and the row says what is closed. A warning makes
 *    people change plans because of the tone rather than because of the fact.
 * 3. **No call to action.** No cards, no "worth going", no link to a provider. The
 *    only link is **the source**, so that we can be checked.
 *
 * The two lists are separated visually and not only in the text: what has a date is
 * shown with the date and the days it touches, and what does not is shown under a
 * heading of its own that says up front that these are windows and not dates.
 *
 * When there is nothing to report the component renders nothing - no heading and no
 * "no events". An empty screen with a contentless heading is exactly "secondary".
 */
export default function TripDateNotes({
  trip,
  destinations,
}: {
  trip: Trip;
  /** The trip's cities only - the country is derived from them, without importing the catalog to the client */
  destinations: Destination[];
}) {
  const { dated, windows } = useMemo(
    () =>
      matchTripCalendar(
        trip,
        calendar,
        destinations.map((d) => ({ slug: d.slug, countrySlug: d.countrySlug })),
      ),
    [trip, destinations],
  );

  if (dated.length === 0 && windows.length === 0) return null;

  return (
    <PanelSection
      panelKey="dates"
      icon="📅"
      title="מה קורה בתאריכים שלכם"
      className="print:hidden"
      ariaLabel="מה קורה בתאריכים של הטיול"
    >
      <ul className="space-y-1.5">
        {dated.map((m) => (
          <Row
            key={m.entry.id}
            entry={m.entry}
            dates={datedLabel(m)}
            confirmed
            meta={`${dayRangeLabel(m.dayNumbers)} בטיול`}
          />
        ))}
      </ul>

      {windows.length > 0 && (
        <>
          <h4 className="mt-3 px-1 text-[11px] font-semibold text-night/40">
            נופל בערך על התאריכים שלכם · {NOT_PUBLISHED}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {windows.map((w) => (
              <Row
                key={w.entry.id}
                entry={w.entry}
                dates={w.entry.window ?? ''}
                confirmed={false}
              />
            ))}
          </ul>
        </>
      )}
    </PanelSection>
  );
}

function Row({
  entry,
  dates,
  confirmed,
  meta,
}: {
  entry: CalendarEntry;
  dates: string;
  confirmed: boolean;
  meta?: string;
}) {
  return (
    <li className="rounded-2xl bg-shell px-3 py-2.5 ring-1 ring-night/10">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-bold text-night">{entry.name}</span>
        <span className="rounded-full bg-night/[0.06] px-2 py-0.5 text-[11px] font-semibold text-night/55">
          {impactLabel(entry)}
        </span>
        {meta && <span className="text-[11px] font-semibold text-night/45">{meta}</span>}
      </div>

      {/*
        The dates row. For an unconfirmed window this is the prose description exactly
        as written in the data, word for word - no date is derived from it and no
        number is displayed.
      */}
      <p
        className={`mt-1 text-xs font-semibold leading-relaxed ${
          confirmed ? 'text-night/75' : 'text-night/55'
        }`}
      >
        {dates}
      </p>

      <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{entry.note}</p>

      <p className="mt-1.5 text-[11px] font-medium text-night/40">
        <a
          href={entry.source.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline decoration-night/20 underline-offset-2 transition hover:text-night/70"
        >
          {sourceLabel(entry)}
        </a>
      </p>
    </li>
  );
}
