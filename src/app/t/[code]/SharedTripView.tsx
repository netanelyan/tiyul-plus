'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Destination, Place } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { isOwnShare, markSharedVisit, trackEvent } from '@/lib/events';
import { track } from '@/lib/analytics';
import { rememberShareArrival } from '@/lib/shareAttribution';
import BuiltWithTiyul from '@/components/BuiltWithTiyul';
import { useTrip } from '@/lib/trip/TripContext';
import { travelLeg } from '@/lib/trip/travel';
import { dayDescription } from '@/lib/trip/dayDescription';
import { formatHebrewRange } from '@/lib/trip/dates';
import type { SharedTrip } from '@/lib/trip/share';
import { tripFromShared } from '@/lib/trip/share';
import PlacesMap from '@/components/PlacesMap';
import { ZoomablePhoto } from '@/components/PhotoLightbox';
import Flag from '@/components/Flag';
import { daysHe } from '@/lib/duration';

/**
 * A read-only view of a shared trip + importing a copy into "my trips".
 *
 * **The cities arrive as props from the server**, not by importing the
 * catalog: this page already decodes the code on the server and knows
 * exactly which cities are involved, so there is no reason the browser
 * should download 2MB of catalog for a one- or two-city trip.
 */
/** The code out of `/t/<code>`, or '' off the client. */
const shareToken = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return decodeURIComponent(window.location.pathname.split('/t/')[1] ?? '');
  } catch {
    return '';
  }
};

/**
 * Whether this browser is the one that created this link.
 *
 * `useSyncExternalStore` and **not** state set from an effect: this repo's lint
 * config rejects `react-hooks/set-state-in-effect` by name, and the server has
 * no answer to this question, so the three-argument form is exactly the shape
 * the problem has. The subscribe callback is a no-op because ownership cannot
 * change while the page is open - the only writer is the trip screen, in
 * another tab, before this page was ever opened.
 *
 * The server snapshot is `false`, so the first paint is the **visitor's** view.
 * That direction is deliberate: the owner briefly seeing a CTA meant for
 * someone else is a harmless flicker, whereas defaulting to "owner" would hide
 * the invitation from every real visitor for a frame.
 */
function useIsOwnShare(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => isOwnShare(shareToken()),
    () => false,
  );
}

export default function SharedTripView({
  shared,
  cityData,
}: {
  shared: SharedTrip;
  cityData: Destination[];
}) {
  const trip = useTrip();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const isOwner = useIsOwnShare();

  /*
    The "shared link opens" counter - only a viewer who is not the owner
    (the token is not in the list of shares this browser created), once per
    tab (a refresh does not inflate it). Waits for hydration because the
    conversion marker is only placed for a browser with no trips yet -
    "the viewer created a trip of their own" measures new people, not
    existing planners. Admin is muted inside trackEvent itself (the
    internal flag).
  */
  useEffect(() => {
    if (!trip.hydrated) return;
    const token = shareToken();
    if (!token || isOwnShare(token)) return;
    /*
      Attribution is recorded **before** the once-per-tab guard below, and
      outside it. The guard exists so a refresh does not inflate the counter;
      the origin of the trip this person may build is not a counter, and a
      visitor who reloads the link and then plans should still be credited to
      it. `rememberShareArrival` is itself first-wins, so repeating it is free.
    */
    rememberShareArrival(token);
    const seenKey = `tiyul-plus:opened:${token.slice(0, 40)}`;
    try {
      if (sessionStorage.getItem(seenKey)) return;
      sessionStorage.setItem(seenKey, '1');
    } catch {
      /* No sessionStorage - count anyway, double counting beats no counting */
    }
    trackEvent('shared_open');
    if (trip.trips.length === 0) markSharedVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.hydrated]);

  const destOf = (slug: string) => cityData.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  const totalStops = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
  const cities = useMemo(
    () => [...new Set(shared.days.map((d) => d.citySlug))].map(destOf).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  );

  const allPlaces: Place[] = useMemo(
    () =>
      shared.days.flatMap((d) =>
        d.placeIds.map((id) => placeOf(d.citySlug, id)).filter((p): p is Place => Boolean(p)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  );
  const mapCenter = allPlaces[0]
    ? { lat: allPlaces[0].lat, lng: allPlaces[0].lng }
    : { lat: 48.2, lng: 16.37 };

  function saveToMyTrips() {
    // The owner copying their own link is not the viral loop, and counting it
    // would inflate the one number this feature exists to move.
    if (!isOwner) track('share_duplicate');
    trip.createTripFrom(tripFromShared(shared));
    setSaved(true);
    setTimeout(() => router.push('/chat'), 600);
  }

  /** The invitation, for people who are not the trip's author. Rendered twice - see below. */
  const planCta = (placement: 'bar' | 'inline') => (
    <Link
      href="/planner"
      onClick={() => track('share_cta_click', { surface: 'shared_trip', element: placement })}
      className={
        placement === 'bar'
          ? 'flex-1 rounded-xl bg-sunset px-4 py-2.5 text-center text-sm font-extrabold text-cream transition hover:bg-sunset-deep'
          : 'rounded-xl bg-sunset px-6 py-3 text-center font-bold text-cream transition hover:bg-sunset-deep'
      }
    >
      תכננו טיול משלכם, בחינם
    </Link>
  );

  return (
    /*
      A fragment, with the sticky bar as a SIBLING of `.rise-in` rather than a
      child of it. `.rise-in` keeps its final transform forever, and a transform
      creates a containing block - so a `fixed` bar nested inside it is measured
      against the article, not the viewport. That is the documented trap that
      caught TripWorkspace's mobile chat bar, and this is the same fix it uses,
      down to `clears-chat-bar` reserving the height so the bar never covers the
      last day of the plan.
    */
    <>
    <div className="rise-in clears-chat-bar">
      {/* Header */}
      <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-sunset-deep">טיול ששותף איתכם · צפייה חופשית</p>
          <BuiltWithTiyul surface="shared_trip" />
        </div>
        <h1 className="display mt-1 text-3xl text-night">{shared.name}</h1>
        <p className="mt-2 text-sm font-semibold text-night/70">
          {daysHe(shared.days.length)} · {totalStops} עצירות
          {formatHebrewRange(shared.startDate, shared.endDate)
            ? ` · ${formatHebrewRange(shared.startDate, shared.endDate)}`
            : ''}{' '}
          ·{' '}
          {cities.map((c, i) => (
            <span key={c!.slug}>
              {i > 0 && ' + '}
              <Flag flag={c!.flag} label={c!.name} size="sm" className="mx-1" />
              {c!.name}
            </span>
          ))}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveToMyTrips}
            disabled={saved}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-70"
          >
            {saved ? '✓ נשמר, עוברים לטיול...' : 'שמירה אצלי ועריכה חופשית'}
          </button>
          <span className="text-xs font-medium text-night/65">
            נשמר עותק ל&quot;הטיולים שלי&quot;. המקור של השולח לא משתנה
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="mt-5 h-[320px] overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-[400px]">
        <PlacesMap center={mapCenter} zoom={12} places={allPlaces} />
      </div>

      {/* The days */}
      <div className="mt-5 space-y-4">
        {shared.days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? shared.days[i - 1] : null;
          const dayObj = { id: String(i), citySlug: d.citySlug, placeIds: d.placeIds, notes: d.notes };
          // The transfer is computed from the real coordinates. There is no
          // car flag here: the share payload deliberately excludes
          // preferences, so hasCar stays false.
          const leg =
            prev && prev.citySlug !== d.citySlug
              ? travelLeg(prev.citySlug, d.citySlug, {
                  from: destOf(prev.citySlug),
                  to: destOf(d.citySlug),
                })
              : null;
          return (
            <div key={i}>
              {prev && leg && (
                <p className="mb-4 rounded-full border-[1.5px] border-dashed border-sunset/55 px-4 py-2 text-center text-sm font-bold text-night">
                  {leg.emoji} מעבר: {destOf(prev.citySlug)?.name} ←{' '}
                  {dst?.name} · {leg.label}
                </p>
              )}
              <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset font-black text-cream">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-bold text-night">
                      יום {i + 1} · {dst?.name}
                    </h2>
                    <p className="text-xs text-night/70">{dayDescription(dayObj, dst)}</p>
                  </div>
                </div>
                {d.notes && (
                  <p className="mt-3 rounded-lg bg-zest/15 px-3 py-2 text-sm text-night">💡 {d.notes}</p>
                )}
                <ol className="mt-3 space-y-3">
                  {d.placeIds.map((pid, j) => {
                    const p = placeOf(d.citySlug, pid);
                    if (!p) return null;
                    return (
                      <li key={pid} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-night/5 text-xs font-bold text-night/70">
                          {j + 1}
                        </span>
                        {/* The cities already arrive as full Destination props, so the
                            photo costs nothing extra here - and PlaceThumb falls back to
                            the category tile for the places that have none. */}
                        <ZoomablePhoto place={p} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
                        <div className="min-w-0">
                          <p className="font-semibold text-night">
                            {p.name}
                            {p.mustSee && (
                              <span className="ms-1.5 text-sm text-zest" title="חובה לראות">
                                ★
                              </span>
                            )}
                            <span className="ms-2 whitespace-nowrap text-xs font-medium text-night/65">
                              {categoryMeta[p.category].label}
                            </span>
                          </p>
                          <p className="line-clamp-3 text-sm leading-relaxed text-night/70">
                            {p.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
          );
        })}
      </div>

      {/*
        Bottom CTA - **non-owners only**. Somebody looking at the trip they
        built and sent does not need to be invited to build one; for them the
        page ends with the plan, which is what they came to check.
      */}
      {!isOwner && (
        <div className="mt-6 rounded-2xl bg-night px-6 py-5 text-center">
          <p className="font-bold text-cream">אהבתם? ככה זה נראה כשבונים טיול כאן.</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-cream/70">
            אותו מסלול, אותה מפה, לפי מה שמעניין אתכם. בלי להירשם ובלי לשלם.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            {planCta('inline')}
            <button
              onClick={saveToMyTrips}
              disabled={saved}
              className="rounded-xl bg-cream/10 px-6 py-3 font-bold text-cream ring-1 ring-cream/25 transition hover:bg-cream/15 disabled:opacity-70"
            >
              {saved ? '✓ נשמר' : 'שכפלו את הטיול הזה'}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ---------- Mobile: the slim sticky bar ----------
        `lg:hidden` because from lg the same invitation is already inline above,
        and two of it is nagging. `end-3 start-20` leaves the accessibility
        button its corner - the bar sits beside it, never over it - and z-40
        stays below that button's z-[60] so even an overlap could not swallow
        it. */}
    {!isOwner && (
      <div className="chat-bar-bottom fixed end-3 start-20 z-40 flex items-center gap-2 rounded-2xl bg-shell p-2 shadow-[0_10px_30px_-12px_rgba(36,27,77,0.5)] ring-1 ring-night/15 lg:hidden print:hidden">
        {planCta('bar')}
        <button
          onClick={saveToMyTrips}
          disabled={saved}
          className="shrink-0 rounded-xl bg-night/5 px-3 py-2.5 text-sm font-bold text-night transition hover:bg-night/10 disabled:opacity-70"
        >
          {saved ? '✓' : 'שכפול'}
        </button>
      </div>
    )}
    </>
  );
}
