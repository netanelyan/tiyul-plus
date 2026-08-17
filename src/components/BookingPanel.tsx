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
 * "What the trip is still missing" - the booking layer inside the trip view.
 *
 * The panel is the *deterministic* side of the feature: the statuses come from
 * `Trip.preferences.booking` (the agent stores them, or the user clicks here),
 * and the links are always assembled in `src/lib/booking.ts`. No URL ever comes
 * from the model, so it cannot invent a link, a price or availability.
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
   * Offline the panel stays **readable** - what is already arranged and what is
   * still missing is exactly what you want to see on the ground - but a status
   * cannot be changed (that is a write to the trip) and a provider's site cannot
   * be opened. The link is not hidden: it looks disabled and says why, so it does
   * not read as a broken feature.
   */
  offline?: boolean;
}) {
  const [open, setOpen] = useState(false);

  /**
   * The trip's cities, in order. On a multi-city trip, searching by the first city
   * alone returns hotels in the wrong place, so the traveller picks here which city
   * to search. The Latin name comes from our own data; nameLocal is sometimes
   * written as "Vienna / Wien" - we send only the first part, because a string with
   * a slash returns empty results at the providers.
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
   * The selected city **per kind separately**, not for the panel as a whole.
   *
   * There used to be a single picker above all the cards, and it hid the real
   * problem: it switched only the *search target* while the status was stored for
   * the whole trip - so pressing "already booked" while Bratislava was selected
   * also marked Vienna. Now the picker lives inside the card it belongs to, and it
   * switches both the search and the status.
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
            // How many cities are still open for this kind - the answer to "what is left" without opening each one
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
                      {/* The status belongs to the city, so it is stated together with it */}
                      {perCity && cities.length > 1 && city ? `${city.label}: ` : ''}
                      {BOOKING_STATUS_LABELS[status]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{p.blurb}</p>

                {/*
                  The city picker, inside the card it belongs to. Shown only when
                  there is more than one city - on a one-city trip it was a row
                  restating what the trip title already says.
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
                            A small dot on a city that has already been answered.
                            Without it the picker hides the very thing it exists to
                            solve: there is no way to tell which cities have been
                            handled without clicking each one.
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

                {/* Manual marking - exactly the same field the agent writes to */}
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
          Affiliate disclosure. **Mandatory, not optional** - so it is always shown,
          even while there is not a single real affiliate id in the environment.
          "May" is the correct wording in both states. The sentence about not
          affecting the ranking is a promise the code keeps: the card order is the
          config order, which was set by what a traveller needs, and does not depend
          on whether a provider has an affiliate id - there is a test for that.
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
