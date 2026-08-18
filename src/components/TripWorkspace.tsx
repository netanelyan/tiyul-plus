'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { inHe } from '@/lib/hebrew';
import type { Place } from '@/lib/types';
import type { TripPin, TripPreferences } from '@/lib/trip/types';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { travelLeg } from '@/lib/trip/travel';
import { useTripChat } from '@/lib/trip/useTripChat';
import { useCityData } from '@/lib/trip/cityData';
import { dayDescription, dayPlaces } from '@/lib/trip/dayDescription';
import { dayColor } from '@/lib/trip/dayColors';
import { dayDate, formatHebrewDate, formatHebrewRange, todayISO } from '@/lib/trip/dates';
import TripDates from '@/components/TripDates';
import { encodeTripShare } from '@/lib/trip/share';
import { travelModeFor } from '@/lib/trip/mapsExport';
import { rememberOwnShare, trackEvent } from '@/lib/events';
import PlacesMap from '@/components/PlacesMap';
import type { MapGroup, MapPin } from '@/components/MapInner';
import BookingPanel from '@/components/BookingPanel';
import TripCost from '@/components/TripCost';
import PinsPanel from '@/components/PinsPanel';
import ActivitiesPanel from '@/components/ActivitiesPanel';
import TripDateNotes from '@/components/TripDateNotes';
import ShabbatKosherPanel from '@/components/ShabbatKosherPanel';
import TripSkeleton from '@/components/TripSkeleton';
import { shabbatRowsFor } from '@/lib/trip/shabbatRows';
import TripGroupPanel from '@/components/TripGroupPanel';
import PreDepartureCheck from '@/components/PreDepartureCheck';
import PanelSection from '@/components/PanelSection';
import PaidTools from '@/components/PaidTools';
import ChatPanel from '@/components/ChatPanel';
import Flag from '@/components/Flag';
import Logo from '@/components/Logo';
import AddDayPicker from '@/components/AddDayPicker';
import ImportMapModal from '@/components/ImportMapModal';
import DayNavExport from '@/components/DayNavExport';
import { OFFLINE_HINT, isoDay, useOnline } from '@/lib/offline/online';
import { readOnlyIfOffline } from '@/lib/trip/readOnly';
import { cachedAt, pruneCities } from '@/lib/trip/cityStore';
import { daysHe } from '@/lib/duration';

/**
 * The unified trip view - one screen for everything about the active trip:
 * the day's itinerary (fully editable by hand) + map + the agent conversation,
 * together. There is no separate "chat tab" versus "plan tab" any more: both
 * /chat and /planner render this component, and both work on the same Trip
 * object (TripContext) - a request in the conversation ("add a day") updates
 * the very trip drawn here, with no copy.
 *
 * Layout:
 * - xl: three columns - itinerary (right), map (middle), conversation (left).
 * - lg: itinerary + map side by side, the conversation a full-width panel below.
 * - mobile (~390px): everything stacks - map, day card, stops, all-days overview -
 *   with the conversation in a sticky bottom bar that opens into a full drawer.
 */

export default function TripWorkspace({
  onNewTrip,
  initialQuery,
  initialKosher,
}: {
  onNewTrip: () => void;
  initialQuery?: string;
  initialKosher?: boolean;
}) {
  const online = useOnline();
  const offline = !online;
  /**
   * Offline the trip is read-only - see the reasoning in `lib/trip/readOnly.ts`.
   * The wrapper here replaces the whole API, so every call on this screen goes
   * through it and no control can be missed. The controls themselves are disabled
   * separately, so it looks switched off rather than broken.
   */
  const trip = readOnlyIfOffline(useTrip(), offline);
  const chat = useTripChat({ initialQuery, initialKosher });
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  /** 'day' = the selected day's map - 'trip' = every stop of every day together */
  const [mapMode, setMapMode] = useState<'day' | 'trip'>('day');
  const [chatOpen, setChatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [allDaysOpen, setAllDaysOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  /** Id of the day whose notes field is open (a day with no note shows only a button) */
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  /**
   * A one-off hint pointing at the composer line for the agent.
   *
   * This is all that remains of the "tutorial" idea: a walkthrough screen was
   * rejected because it removes no control and in fact adds some, and teaches
   * people to tolerate a crowded screen instead of uncrowding it. One line
   * explaining where the main thing is done is worth the space.
   *
   * Initialised to false and read from localStorage only after mount, so the
   * server and the client agree on the first paint (the same hydration trap
   * solved this way in PromptChips). Shown once per browser and never again.
   */
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    try {
      // localStorage does not exist on the server, so the read must happen after
      // mount: initialising directly from it would create a hydration mismatch.
      // Exactly the same pattern as PromptChips and AccessibilityWidget here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(COACH_KEY)) setCoach(true);
    } catch {
      /* storage blocked - simply do not show it */
    }
  }, []);
  const dismissCoach = () => {
    setCoach(false);
    try {
      window.localStorage.setItem(COACH_KEY, '1');
    } catch {
      /* storage blocked - the hint just disappears for this session, and that is fine */
    }
  };
  const [linkCopied, setLinkCopied] = useState(false);
  /**
   * The share link: we try for a short code via /api/share (Supabase); with no
   * backend configured we fall back silently to the long inline link (v1), which
   * always works. The result is kept in a ref keyed by trip content so a new code
   * is not minted on every click.
   *
   * **This ref must sit here, above the loading state's early `return`.**
   * It used to sit below it, which is a hooks-rule violation that simply never
   * blew up: the only early state was `!trip.hydrated`, which never actually
   * painted. The moment a real loading state was added (the cities), the next
   * render ran one more hook - React #310, and the whole trip screen went down.
   * A hook after a conditional `return` is a time bomb.
   */
  const shareUrlCache = useRef<{ sig: string; url: string } | null>(null);
  /** A pin the traveller chose to place by hand: the next click on the map sets its location */
  const [placingPinId, setPlacingPinId] = useState<string | null>(null);

  const t = trip.currentTrip;
  // **Only this trip's cities are loaded**, from `/api/cities`, instead of
  // importing the whole catalog into this screen's bundle (492kB compressed for
  // a one-city trip). They are cached at module level, so switching between
  // trips or between /chat and /planner asks for nothing again.
  const tripCitySlugs = useMemo(
    () => [...new Set([...(t?.citySlugs ?? []), ...(t?.days ?? []).map((d) => d.citySlug)])],
    [t],
  );
  const { cities, loading: citiesLoading } = useCityData(tripCitySlugs);

  /**
   * "Do not cache the catalog" is a rule that has to be enforced, not merely
   * stated: here everything no saved trip touches any more is deleted from the
   * device - deleting a trip frees its content too. Runs only after hydration,
   * otherwise a momentarily empty trips array would wipe everything stored.
   */
  useEffect(() => {
    if (!trip.hydrated) return;
    const keep = new Set<string>();
    for (const tr of trip.trips) {
      for (const s of tr.citySlugs) keep.add(s);
      for (const d of tr.days) keep.add(d.citySlug);
    }
    pruneCities([...keep]);
  }, [trip.hydrated, trip.trips]);
  const destinations = useMemo(() => Object.values(cities), [cities]);
  // Curated first; automatically explored destinations (AI Explorer) as a
  // fallback, so a trip built on an explored destination still renders normally
  // on the canvas, the map and in print.
  const destOf = (slug: string) =>
    cities[slug] ?? chat.explored.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  // Inter-city travel: computed from the real coordinates, and car-aware - so we
  // do not announce a "flight" for a two-hour drive inside one country.
  const carStatus = t?.preferences?.booking?.car;
  const hasCar = carStatus === 'have' || carStatus === 'need';
  const legOf = (fromSlug: string, toSlug: string) =>
    travelLeg(fromSlug, toSlug, {
      from: destOf(fromSlug),
      to: destOf(toSlug),
      hasCar,
    });

  /**
   * When the city of the displayed day was last saved to the device. Shown **only**
   * beside kashrut information and only when offline: a supervision badge cached a
   * week ago and presented as if checked now is the worst failure the offline mode
   * can produce. Read only when offline, to avoid touching localStorage on every
   * ordinary render.
   */
  const day = t ? (t.days.find((d) => d.id === selectedDayId) ?? t.days[0] ?? null) : null;
  const dayCachedAt = useMemo(
    () => (offline && day ? cachedAt(day.citySlug) : null),
    [offline, day],
  );
  const dayDest = day ? destOf(day.citySlug) : null;
  const dayIndex = t && day ? t.days.findIndex((d) => d.id === day.id) : -1;

  const places: Place[] = useMemo(
    () => (day ? dayPlaces(day, dayDest) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, dayDest, t],
  );

  // Whole-trip view: each day as a group - its own colour and the day number in the pin.
  const tripGroups: MapGroup[] = useMemo(
    () =>
      (t?.days ?? [])
        .map((d, i) => ({
          badge: String(i + 1),
          color: dayColor(i),
          places: dayPlaces(d, destOf(d.citySlug)),
        }))
        .filter((g) => g.places.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, cities, chat.explored],
  );

  /**
   * The trip's "today": the index of the day whose date is actually today - null
   * when there are no dates or the trip is not under way. This is what turns on
   * companion mode: auto-opening the right day + a "today" bar above the day picker.
   */
  const todayIdx = useMemo(() => {
    if (!t?.startDate || t.days.length === 0) return null;
    const today = todayISO();
    const idx = t.days.findIndex((_, i) => dayDate(t, i) === today);
    return idx >= 0 ? idx : null;
  }, [t]);

  /*
    Auto-open on today's day - once per trip, so we do not fight a user who chose
    a different day deliberately. Mid-trip, opening on day 1 hands the traveller a
    screen they are already done with.
  */
  const autoOpenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!t || todayIdx === null || autoOpenedFor.current === t.id) return;
    autoOpenedFor.current = t.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (todayIdx > 0) setSelectedDayId(t.days[todayIdx].id);
  }, [t, todayIdx]);

  /**
   * The traveller's pins on the map. Only those with a real location - a pin with
   * no coordinates is not drawn anywhere, because a guessed location is worse than
   * a missing one. The identity stays stable (useMemo) so the map does not jump on
   * every render, exactly like flat in MapInner.
   */
  const allPins: MapPin[] = useMemo(
    () =>
      (t?.pins ?? [])
        .filter((p): p is TripPin & { lat: number; lng: number } =>
          typeof p.lat === 'number' && typeof p.lng === 'number',
        )
        .map((p) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          address: p.address,
          note: p.note,
        })),
    [t?.pins],
  );

  /** On the day map we show only that city's pins, plus those with no city. */
  const dayPins: MapPin[] = useMemo(() => {
    const citySlug = day?.citySlug;
    const byId = new Map((t?.pins ?? []).map((p) => [p.id, p]));
    return allPins.filter((p) => {
      const src = byId.get(p.id);
      return !src?.citySlug || src.citySlug === citySlug;
    });
  }, [allPins, day?.citySlug, t?.pins]);

  // **Waiting on the cities too, deliberately.** Without this the screen would
  // briefly draw a real trip with empty days and an empty map - because every
  // name, coordinate and description comes from the city data. A loading screen
  // beats a screen that looks like a deleted trip. This applies only to the first
  // wait: once one city is in hand we keep drawing (see useCityData).
  if (!trip.hydrated || (citiesLoading && (t?.days.length ?? 0) > 0)) {
    // A skeleton in the shape of the screen rather than a single "loading" box -
    // the structure appears immediately and the content fills into it, with no
    // jump from nothing to everything (see TripSkeleton).
    return <TripSkeleton />;
  }

  const totalStops = t?.days.reduce((n, d) => n + d.placeIds.length, 0) ?? 0;

  /**
   * The navigation start point: the lodging in the day's city, if the traveller
   * recorded it **and the location was verified**. A pin with no coordinates does
   * not qualify - navigating to a guessed point is exactly the kind of mistake
   * this site avoids everywhere else.
   */
  const dayStart = (() => {
    const stay = (t?.pins ?? []).find(
      (p) =>
        p.kind === 'stay' &&
        typeof p.lat === 'number' &&
        typeof p.lng === 'number' &&
        (!p.citySlug || p.citySlug === day?.citySlug),
    );
    return stay ? { name: stay.name, lat: stay.lat!, lng: stay.lng! } : null;
  })();

  const setPrefs = (patch: Partial<TripPreferences>) => {
    if (!t) return;
    trip.upsertTrip({ ...t, preferences: { ...t.preferences, ...patch } });
  };

  /**
   * The traveller placed the pin themselves - by clicking the map or dragging it.
   * That is the most reliable source there is, so source becomes 'manual' and
   * placement mode closes.
   */
  const movePin = (id: string, lat: number, lng: number) => {
    if (!t) return;
    trip.upsertTrip({
      ...t,
      pins: (t.pins ?? []).map((p) =>
        p.id === id ? { ...p, lat, lng, source: 'manual' as const } : p,
      ),
    });
    setPlacingPinId(null);
  };

  const removePin = (id: string) => {
    if (!t) return;
    trip.upsertTrip({ ...t, pins: (t.pins ?? []).filter((p) => p.id !== id) });
    if (placingPinId === id) setPlacingPinId(null);
  };

  async function getShareUrl(): Promise<string> {
    if (!t) return '';
    const sig = JSON.stringify([t.name, t.days.map((d) => [d.citySlug, d.placeIds, d.notes ?? ''])]);
    if (shareUrlCache.current?.sig === sig) return shareUrlCache.current.url;
    const longToken = encodeTripShare(t);
    let url = `${window.location.origin}/t/${longToken}`;
    // Both tokens are recorded as "mine": a "shared link opens" counter should not
    // count the owner opening their own link - see lib/events.ts
    rememberOwnShare(longToken);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: t }),
      });
      const data = (await res.json()) as { code?: string | null };
      if (data.code) {
        url = `${window.location.origin}/t/${data.code}`;
        rememberOwnShare(data.code);
      }
    } catch {
      /* stay with the long link */
    }
    shareUrlCache.current = { sig, url };
    return url;
  }

  async function copyShareLink() {
    if (!t) return;
    const url = await getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      trackEvent('share');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    if (!t) return;
    trackEvent('whatsapp');
    // Open the window synchronously (survives popup blockers) and navigate once the link is ready
    const win = window.open('', '_blank');
    void getShareUrl().then((url) => {
      // A suitcase and not an aeroplane: the plane is an old Unicode character
      // (U+2708+VS16) that some platforms render as a replacement glyph - the
      // suitcase is a single modern codepoint that renders everywhere
      const when = formatHebrewRange(t.startDate, t.endDate);
      const text = `שיתפתי איתך את הטיול "${t.name}"${when ? ` · ${when}` : ''} שבניתי בטיול+ 🧳\n${url}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (win) win.location.href = wa;
      else window.open(wa, '_blank', 'noopener');
    });
  }

  // Share links are validated against the curated catalog only - a trip with an
  // automatically explored destination is not shareable yet (next step: a v2
  // payload carrying the places themselves)
  const hasExploredCity = Boolean(t?.days.some((d) => d.citySlug.startsWith('explored-')));

  /**
   * The preferences actually set, as text - so collapsing them hides no
   * information. The chips themselves open on click; what is already chosen stays
   * readable even when they are collapsed.
   */
  const prefSummary = t
    ? [
        t.preferences?.kosher === true ? 'כשר' : null,
        t.preferences?.pace === 'packed' ? 'דחוס' : t.preferences?.pace === 'relaxed' ? 'רגוע' : null,
        t.preferences?.party
          ? { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'סולו' }[t.preferences.party]
          : null,
        t.preferences?.shopping
          ? { more: 'שופינג: יותר', normal: 'שופינג: רגיל', less: 'שופינג: פחות' }[
              t.preferences.shopping
            ]
          : null,
        t.preferences?.shabbatAware ? 'שומרי שבת' : null,
        t.preferences?.budget
          ? { low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[t.preferences.budget]
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    // The sticky bar and the drawer must sit outside .rise-in: an animation with
    // fill-mode both leaves a transform on the element, and that creates a
    // containing block which "breaks" position:fixed for descendants.
    <>
    <div className="rise-in pb-24 lg:pb-0">
      {/* ---------- Trip header ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {t ? (
            <input
              value={t.name}
              onChange={(e) => trip.renameTrip(t.id, e.target.value)}
              readOnly={offline}
              title={offline ? OFFLINE_HINT : undefined}
              aria-label="שם הטיול"
              className="display w-full min-w-0 rounded-xl bg-transparent text-2xl text-night outline-none ring-sunset/50 transition focus:ring-2 sm:w-64"
            />
          ) : (
            <span className="display text-2xl text-night">הטיול החדש שלכם</span>
          )}
          {t ? (
            <TripDates
              disabled={offline}
              trip={t}
              summary={`${totalStops} עצירות · ${daysHe(t.days.length)}`}
              onSet={(dates) => trip.setTripDates(t.id, dates)}
              onAddDays={(n) => {
                // Add in the trip's last city - the natural continuation of the route
                const slug = t.days[t.days.length - 1]?.citySlug ?? t.citySlugs[0];
                if (slug) for (let i = 0; i < n; i++) trip.addDay(slug);
              }}
            />
          ) : (
            <span className="badge shrink-0 rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60">
              הסוכן בונה…
            </span>
          )}
        </div>
        {/*
          Three controls instead of seven. Everything stays within reach - sharing
          in one menu, the rest under a "more" menu, and delete at its bottom
          separated by a rule: a destructive action should not sit on the first
          screen at the same visual weight as sharing.
        */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Btn onClick={onNewTrip} disabled={offline} title={offline ? OFFLINE_HINT : undefined}>+ טיול חדש</Btn>
          {!t && (
            <Btn onClick={() => setImportOpen(true)} disabled={offline} title={offline ? OFFLINE_HINT : undefined}>
              📍 ייבוא מפה
            </Btn>
          )}
          {t && !hasExploredCity && (
            <Menu
              ariaLabel="שיתוף הטיול"
              label="שיתוף"
              icon={ICONS.link}
              items={[
                {
                  label: linkCopied ? 'הקישור הועתק ✓' : 'העתקת קישור',
                  onClick: copyShareLink,
                  disabled: offline,
                  icon: linkCopied ? ICONS.check : ICONS.link,
                },
                { label: 'שליחה בוואטסאפ', onClick: shareWhatsApp, icon: ICONS.whatsapp, disabled: offline },
              ]}
            />
          )}
          {t && (
            <Menu
              ariaLabel="עוד פעולות"
              label="⋯"
              items={[
                {
                  label: 'שכפול הטיול',
                  onClick: () => trip.duplicateTrip(t.id),
                  icon: ICONS.duplicate,
                  disabled: offline,
                },
                { label: '📍 ייבוא מפה מ-Google', onClick: () => setImportOpen(true), disabled: offline },
                {
                  label: 'הדפסה / PDF',
                  onClick: () => {
                    // Sent before print, because print blocks the thread. keepalive does the rest.
                    trackEvent('print');
                    window.print();
                  },
                  icon: ICONS.printer,
                },
                {
                  label: 'מחיקת הטיול',
                  danger: true,
                  disabled: offline,
                  separated: true,
                  icon: ICONS.trash,
                  onClick: () => {
                    if (confirm('למחוק את הטיול הזה?')) {
                      trip.deleteTrip(t.id);
                      setSelectedDayId(null);
                    }
                  },
                },
              ]}
            />
          )}
          {/*
            Preferences sit in the actions row rather than a row of their own: a
            whole row for one collapsed control is exactly the kind of waste that
            pushed the map into the bottom half of the screen in the screenshot
            Netanel sent.
          */}
          {t && (
            <button
              onClick={() => setPrefsOpen((v) => !v)}
              aria-expanded={prefsOpen}
              className="rounded-full bg-night/5 px-2.5 py-1.5 text-xs font-semibold text-night/55 transition hover:bg-night/10 hover:text-night"
            >
              העדפות{prefSummary ? `: ${prefSummary}` : ''}{' '}
              <span aria-hidden className={`inline-block text-xs text-night/40 transition-transform ${prefsOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
          )}
        </div>
      </div>

      {t && prefsOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 print:hidden">
          <ToggleChip
            disabled={offline}
            active={t.preferences?.kosher === true}
            label="כשר"
            onClick={() => setPrefs({ kosher: t.preferences?.kosher === true ? undefined : true })}
          />
          {/*
            A preference is picked from a list, not cycled.
            Every chip here used to be a button that advanced to the next value on
            each click: reaching "shopping: less" took four clicks through two
            wrong values - **and every click writes to the trip and syncs to the
            account** - with no way to see the order or the options. Now you click
            and see all three options with the current one ticked.
          */}
          <PrefSelect
            disabled={offline}
            label="קצב"
            current={t.preferences?.pace}
            options={[
              { value: 'relaxed', label: 'רגוע' },
              { value: 'packed', label: 'דחוס' },
            ]}
            onPick={(v) => setPrefs({ pace: v })}
          />
          <PrefSelect
            disabled={offline}
            label="מי נוסע"
            current={t.preferences?.party}
            options={[
              { value: 'couple', label: 'זוג' },
              { value: 'family', label: 'משפחה' },
              { value: 'friends', label: 'חברים' },
              { value: 'solo', label: 'סולו' },
            ]}
            onPick={(v) => setPrefs({ party: v })}
          />
          <PrefSelect
            disabled={offline}
            label="שופינג"
            current={t.preferences?.shopping}
            options={[
              { value: 'more', label: 'יותר' },
              { value: 'normal', label: 'רגיל' },
              { value: 'less', label: 'פחות' },
            ]}
            onPick={(v) => setPrefs({ shopping: v })}
          />
          {t.preferences?.shabbatAware && <PrefChip label="שומרי שבת" />}
          {t.preferences?.budget && (
            <PrefChip
              label={
                { low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[
                  t.preferences.budget
                ]
              }
            />
          )}
        </div>
      )}

      {/* ---------- "Today": companion mode while the trip is under way ---------- */}
      {t && todayIdx !== null && (() => {
        const todayDay = t.days[todayIdx];
        const dst = destOf(todayDay.citySlug);
        const iso = dayDate(t, todayIdx);
        const viewingToday = day?.id === todayDay.id;
        return (
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-2xl bg-sunset/10 px-4 py-3 ring-1 ring-sunset/25 print:hidden">
            <span aria-hidden className="text-base leading-none">🧭</span>
            <span className="text-sm font-bold text-night">
              היום · יום {todayIdx + 1} מתוך {t.days.length}
              {dst ? ` ${inHe(dst.name)}` : ''}
              {iso ? ` · ${formatHebrewDate(iso, { weekday: true })}` : ''}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-night/55">
              {dayDescription(todayDay, dst)}
            </span>
            {!viewingToday && (
              <button
                onClick={() => setSelectedDayId(todayDay.id)}
                className="rounded-full bg-sunset px-3 py-1 text-xs font-bold text-cream transition hover:bg-sunset-deep"
              >
                ליום של היום ←
              </button>
            )}
          </div>
        );
      })()}

      {/* ---------- The day picker: a card per city, days as numbers inside it ---------- */}
      {t && t.days.length > 0 && (() => {
        /*
          The third iteration of this control, and the shape was finally chosen
          from what it represents. "Flag + day N" pills for every day were three
          rows of the same flag eight times over; bare number chips read like a
          calculator, and the transition emoji floated between the squares like a
          leftover. Netanel photographed both.

          A trip has real structure - runs of days in the same city - so the control
          finally draws exactly that: a card per city carrying the name and flag
          once, with the days as numbers inside it. The line break falls between
          cards (or inside a card, like a small calendar) - i.e. at a meaningful
          boundary, not mid-strip. The transition emoji is gone: the gap between
          cards already says "the city changes here".
        */
        const segments: { citySlug: string; days: { id: string; index: number }[] }[] = [];
        for (const [i, d] of t.days.entries()) {
          const last = segments[segments.length - 1];
          if (last && last.citySlug === d.citySlug) last.days.push({ id: d.id, index: i });
          else segments.push({ citySlug: d.citySlug, days: [{ id: d.id, index: i }] });
        }
        return (
          <div className="mt-4 flex flex-wrap items-end gap-2 print:hidden">
            {segments.map((seg) => {
              const dst = destOf(seg.citySlug);
              return (
                <div
                  key={seg.days[0].id}
                  role="group"
                  aria-label={dst?.name}
                  className="rounded-2xl bg-shell p-1.5 ring-1 ring-night/10"
                >
                  <div className="flex items-center gap-1 px-1 pb-1 text-[11px] font-bold text-night/45">
                    <Flag flag={dst?.flag} label={dst?.name ?? ''} size="sm" />
                    <span className="truncate">{dst?.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {seg.days.map(({ id, index }) => {
                      const iso = dayDate(t, index);
                      const active = day?.id === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedDayId(id)}
                          aria-label={`יום ${index + 1}${dst ? ` ${inHe(dst.name)}` : ''}${iso ? `, ${formatHebrewDate(iso)}` : ''}`}
                          aria-current={active ? 'true' : undefined}
                          className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-1.5 text-sm font-bold transition ${
                            active
                              ? 'bg-sunset text-cream'
                              : 'bg-cream text-night/55 hover:bg-night/5'
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <AddDayPicker
              disabled={offline}
              tripCitySlugs={t.citySlugs}
              onAddDay={(slug) => trip.addDay(slug)}
            />
          </div>
        );
      })()}

      {/* ---------- The unified screen: itinerary - map - conversation ---------- */}
      {/*
        The agent is the product, and it was the narrowest and quietest column
        (22rem against 20 for the itinerary). It now gets the wider of the two
        columns flanking the map.
      */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,21rem)] xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,25rem)] print:hidden">
        {/* Map - first on mobile, middle column from lg */}
        <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
          <div className="lg:sticky lg:top-20">

            {mapMode === 'trip' && tripGroups.length > 0 ? (
              <>
                <div className="relative isolate h-64 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-80 lg:h-[30rem]">
                {/*
                  The view switch sits on the map, not in a row of its own above
                  it. It is a control of the map, and as a separate row it cost
                  ~60px of the screen height where the trip needs to be visible -
                  in the screen Netanel photographed, almost half the height was
                  controls before the map even started. Physical `right`/`left` on
                  purpose: the Leaflet container is LTR and the zoom controls sit
                  at physical left, so the switch goes to physical right.
                */}
                {t && t.days.length > 1 && tripGroups.length > 0 && (
                  <MapModeSwitch
                    mode={mapMode}
                    dayLabel={`יום ${dayIndex + 1}`}
                    onMode={setMapMode}
                  />
                )}
                  <PlacesMap
                    center={{
                      lat: tripGroups[0].places[0].lat,
                      lng: tripGroups[0].places[0].lng,
                    }}
                    zoom={12}
                    places={[]}
                    groups={tripGroups}
                    pins={allPins}
                    onPinMove={movePin}
                    placingPinId={placingPinId}
                  />
                </div>
                {/* Day legend - clicking jumps to that day */}
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 print:hidden">
                  {t!.days.map((d, i) => {
                    const g = tripGroups.find((gr) => gr.badge === String(i + 1));
                    if (!g) return null;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDayId(d.id);
                          setMapMode('day');
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-shell px-2.5 py-1 text-xs font-semibold text-night/70 ring-1 ring-night/10 transition hover:ring-night/25"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: g.color }}
                        />
                        יום {i + 1} · {destOf(d.citySlug)?.name}
                        {(() => {
                          const iso = t ? dayDate(t, i) : null;
                          return iso ? (
                            <span className="ms-1.5 text-xs font-medium text-night/45">
                              · {formatHebrewDate(iso)}
                            </span>
                          ) : null;
                        })()}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : dayDest && places.length > 0 ? (
              <div className="relative isolate h-64 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-80 lg:h-[34rem]">
              {/*
                The view switch sits on the map, not in a row of its own above it.
                It is a control of the map, and as a separate row it cost ~60px of
                the screen height where the trip needs to be visible - in the
                screen Netanel photographed, almost half the height was controls
                before the map even started. Physical `right`/`left` on purpose:
                the Leaflet container is LTR and the zoom controls sit at physical
                left, so the switch goes to physical right.
              */}
              {t && t.days.length > 1 && tripGroups.length > 0 && (
                <MapModeSwitch
                  mode={mapMode}
                  dayLabel={`יום ${dayIndex + 1}`}
                  onMode={setMapMode}
                />
              )}
                <PlacesMap
                  center={dayDest.center}
                  zoom={dayDest.zoom}
                  places={places}
                  numbered
                  showRoute
                  pins={dayPins}
                  onPinMove={movePin}
                  placingPinId={placingPinId}
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-night/15 px-6 text-center text-sm font-medium leading-relaxed text-night/50 lg:h-[34rem]">
                {t
                  ? 'אין עדיין עצירות ביום הזה - אפשר להוסיף מהרשימה או לבקש מהסוכן'
                  : 'כאן תופיע המפה של הטיול ברגע שהסוכן יבנה אותו'}
              </div>
            )}
            {/*
              The pins, the order and the route line are drawn from stored data and
              work with no network - the background tiles come from an external
              server and do not. Without this sentence, a grey map with floating
              pins reads exactly like a failure.
            */}
            {offline && (places.length > 0 || tripGroups.length > 0) && (
              <p className="mt-2 text-center text-xs font-medium text-night/45 print:hidden">
                מפת הרקע דורשת חיבור. העצירות, הסדר והמסלול מוצגים מהמידע השמור.
              </p>
            )}
          </div>
        </div>

        {/* The day's itinerary */}
        <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
          {t && day && dayDest ? (
            <>
              {/* Inter-city travel */}
              {(() => {
                const prev = dayIndex > 0 ? t.days[dayIndex - 1] : null;
                if (prev && prev.citySlug !== day.citySlug) {
                  const leg = legOf(prev.citySlug, day.citySlug);
                  return (
                    <div className="rounded-xl bg-night/5 px-4 py-3 text-sm font-semibold text-night/80">
                      {leg.emoji} {destOf(prev.citySlug)?.name} ← {dayDest.name} · {leg.label}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-night">
                      <Flag flag={dayDest.flag} label={dayDest.name} size="md" className="me-2" />
                      יום {dayIndex + 1} · {dayDest.name}
                    </h2>
                    {(() => {
                      const iso = dayDate(t, dayIndex);
                      return iso ? (
                        <div className="mt-0.5 text-xs font-semibold text-sunset-deep">
                          {formatHebrewDate(iso, { weekday: true })}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {t.days.length > 1 && (
                    <Menu
                      compact
                      ariaLabel={`פעולות ליום ${dayIndex + 1}`}
                      label="⋯"
                      items={[
                        {
                          label: 'מחיקת היום',
                          danger: true,
                          icon: ICONS.trash,
                          onClick: () => {
                            trip.removeDay(day.id);
                            setSelectedDayId(null);
                          },
                        },
                      ]}
                    />
                  )}
                </div>
                {/* The day description - derived only from the real stops in it */}
                <p className="mt-1 text-sm font-medium leading-relaxed text-night/55">
                  {dayDescription(day, dayDest)}
                </p>
                {/*
                  An empty notes field reads like a form left unfilled. It opens on
                  click - **and is always open when it has content**, otherwise a
                  traveller who wrote a note would think it had been deleted.
                  `noteOpen` is keyed by day.id so an open field is not dragged
                  from one day to another.
                */}
                {day.notes || noteOpenFor === day.id ? (
                  <textarea
                    value={day.notes ?? ''}
                    onChange={(e) => trip.setDayNotes(day.id, e.target.value)}
                    readOnly={offline}
                    title={offline ? OFFLINE_HINT : undefined}
                    placeholder="הערות ליום הזה…"
                    rows={2}
                    autoFocus={noteOpenFor === day.id && !day.notes}
                    className="mt-3 w-full resize-none rounded-xl bg-night/5 px-4 py-2.5 text-base sm:text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
                  />
                ) : (
                  <button
                    onClick={() => setNoteOpenFor(day.id)}
                    className="mt-2 text-xs font-semibold text-night/45 transition hover:text-night"
                  >
                    + הערה ליום
                  </button>
                )}
                {/*
                  The day's navigation. This used to be the full coral button - and
                  therefore the loudest thing on the screen; it is an action for the
                  travel day itself rather than for someone planning from the sofa,
                  so it stays where it is and at this weight. The building of it
                  moved to `lib/trip/mapsExport.ts` - see there for why concatenating
                  coordinates was not enough.
                */}
                <DayNavExport
                  dayNumber={dayIndex + 1}
                  stops={places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }))}
                  start={dayStart}
                  mode={travelModeFor(t?.preferences?.booking?.car)}
                />
              </div>

              {/* Stops */}
              <ol className="space-y-2">
                {places.map((place, i) => {
                  const meta = categoryMeta[place.category];
                  return (
                    <li key={place.id} className="flex gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-night">
                            {place.name}
                            <span className="badge ms-2 text-xs font-medium text-night/40">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: meta.color }}
                              />
                              {meta.label}
                            </span>
                          </div>
                          {/*
                            Four controls per stop (remove, up, down, move to day)
                            were permanently visible - on a four-stop trip that is
                            16 tiny controls competing with the place names, which
                            are the content people came to read. Now there is one
                            button. Actions that are not relevant (up, on the first
                            stop) are not shown at all rather than shown disabled.
                          */}
                          <Menu
                            compact
                            ariaLabel={`פעולות ל${place.name}`}
                            label="⋯"
                            items={[
                              {
                                label: 'הזזה למעלה',
                                onClick: () => trip.movePlace(day.id, i, -1),
                                disabled: offline || i === 0,
                              },
                              {
                                label: 'הזזה למטה',
                                onClick: () => trip.movePlace(day.id, i, 1),
                                disabled: offline || i === places.length - 1,
                              },
                              ...t.days
                                .filter((d) => d.id !== day.id && d.citySlug === day.citySlug)
                                .map((d) => ({
                                  label: `העברה ליום ${t.days.findIndex((x) => x.id === d.id) + 1}`,
                                  onClick: () => trip.movePlaceToDay(day.id, place.id, d.id),
                                  disabled: offline,
                                })),
                              {
                                label: 'הסרה מהיום',
                                danger: true,
                                separated: true,
                                onClick: () => trip.removePlace(day.id, place.id),
                                disabled: offline,
                              },
                            ]}
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-night/60">
                          {place.description}
                        </p>
                        {/*
                          Kashrut + offline = the date must be on screen. Shown
                          only on kosher stops, and only offline: this is not a
                          general note but a precise warning about the one item
                          where "stale" can be unsafe and not merely out of date.
                        */}
                        {offline && place.category.startsWith('kosher') && dayCachedAt !== null && (
                          <p className="mt-1.5 rounded-lg bg-night/5 px-2.5 py-1.5 text-xs font-semibold text-night/60">
                            <span aria-hidden>✡️ </span>
                            מידע הכשרות נשמר במכשיר ב־
                            {formatHebrewDate(isoDay(dayCachedAt), { year: true })}
                            <span className="font-medium text-night/45"> · לוודא מול המקום</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Adding a stop is done in the conversation with the agent (or from
                  the destination page) - not from a raw catalog list. This is just
                  a short reminder, not a control. */}
              <p className="rounded-xl bg-night/[0.03] px-4 py-3 text-sm leading-relaxed text-night/55">
                רוצים להוסיף עצירה? פשוט בקשו מהסוכן - למשל
                <span className="font-semibold text-night/75"> &quot;תוסיף לי את השוק הישן ליום {dayIndex + 1}&quot;</span> -
                או הוסיפו מדף היעד של {dayDest.name}.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-night/15 p-6 text-center">
              <div className="text-2xl">🗺️</div>
              <div className="mt-2 font-bold text-night/70">
                {t ? 'הטיול עוד ריק' : 'הסוכן בונה את הטיול'}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-night/50">
                {t
                  ? 'מוסיפים יום למעלה, או מבקשים מהסוכן בשיחה'
                  : 'ברגע שייבנה מסלול הוא יופיע כאן - ימים, עצירות ומפה - ויתעדכן עם כל בקשה.'}
              </p>
            </div>
          )}
        </div>

        {/* Conversation: a third column beside the map from lg upwards - the agent
            is always to the side, never below the map, even on small laptops.
            On mobile - a drawer at the bottom. */}
        <ChatPanel
          chat={chat}
          coach={coach && online}
          onDismissCoach={dismissCoach}
          className="hidden lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1 lg:flex lg:h-[36rem] lg:self-start"
        />
      </div>

      {/*
        ---------- The paid section: first, and collapsed ----------

        The two things that cost money - the shared trip and the pre-departure
        check - used to sit at positions three and four of the free stack, so a
        traveller scrolling their own plan met a locked panel halfway down. They
        went to the bottom first, which fixed that and buried them; a collapsed
        bar at the top is the placement that is neither.

        Collapsed is the part that makes the top position fair: one bar costs one
        row, so nothing free is pushed down by it. See PaidTools for why the
        children stay in the DOM while collapsed - a printable report lives in
        there.

        The pre-departure check sits here even though it is a one-off purchase
        rather than a subscription: it is the same category, and leaving one paid
        product inside the free stack would have kept the reported problem at
        half size.
      */}
      {t && t.days.length > 0 && (
        <PaidTools>
          <TripGroupPanel trip={t} destOf={destOf} />
          <PreDepartureCheck trip={t} offline={offline} />
        </PaidTools>
      )}

      {/*
        ---------- What is happening on your dates ----------
        Placed first among the secondary panels, because it is the only one where
        timing decides: a closure on a date already chosen is information that
        affects the plan itself, not what gets bought afterwards. It renders
        nothing when there is nothing to report - including for a trip with no
        dates, from which there is nothing to compute.
      */}
      {t && t.days.length > 0 && <TripDateNotes trip={t} destinations={destinations} />}

      {/*
        ---------- Shabbat and kashrut on the trip ----------
        Rendered only when the kashrut preference is on (opt-in, never assumed) and
        only when it has real content - Shabbat times computed for the trip's dates,
        or kashrut data for the trip's cities. The full rules are at the top of the
        component.
      */}
      {t && t.days.length > 0 && <ShabbatKosherPanel trip={t} destOf={destOf} />}

      {/* ---------- The booking layer: what the trip is still missing ---------- */}
      {t && t.days.length > 0 && (
        <BookingPanel trip={t} destinations={destinations} onSetPreferences={setPrefs} offline={offline} />
      )}

      {/* ---------- Daily spend: stored figures, the arithmetic in code ---------- */}
      {t && t.days.length > 0 && (
        <TripCost trip={t} destinations={destinations} onSetPreferences={setPrefs} offline={offline} />
      )}

      {/*
        ---------- Bookable activities in the current day's city ----------
        **Partner content, which is why it sits here and not inside the plan.** It
        is collapsed by default, loads only on click, and never enters the trip
        itself - there is no path by which a Viator activity becomes a stop. When
        the device is offline it has nothing to do at all.
      */}
      {t && day && dayDest && !offline && (
        <ActivitiesPanel citySlug={dayDest.slug} cityName={dayDest.name} />
      )}

      {/* ---------- The traveller's pins: what they have already arranged themselves ---------- */}
      {t && (
        <PinsPanel
          trip={t}
          destinations={destinations}
          placingPinId={placingPinId}
          onStartPlacing={setPlacingPinId}
          onRemovePin={removePin}
        />
      )}

      {/*
        ---------- All-days overview (with a description per day) ----------
        This used to be permanently open from lg upwards. It repeats the day tabs
        and the day card already shown above, so on the first screen it is pure
        noise - now collapsed at every width, one click away.
      */}
      {t && t.days.length > 0 && (
        <PanelSection
          panelKey="alldays"
          icon="📋"
          title={`כל הימים (${t.days.length})`}
          className="print:hidden"
          open={allDaysOpen}
          onToggle={() => setAllDaysOpen((v) => !v)}
        >
            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {t.days.map((d, i) => {
                const dst = destOf(d.citySlug);
                const isCurrent = d.id === day?.id;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelectedDayId(d.id)}
                      className={`w-full rounded-xl p-3 text-start ring-1 transition ${
                        isCurrent
                          ? 'bg-sunset/5 ring-sunset/40'
                          : 'bg-shell ring-night/10 hover:ring-night/25'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-night">יום {i + 1}</span>
                        <span className="badge truncate text-sm text-night/50">
                          <Flag flag={dst?.flag} label={dst?.name} size="sm" />
                          {dst?.name}
                        </span>
                        <span className="ms-auto shrink-0 text-xs font-medium text-night/40">
                          {d.placeIds.length} עצירות
                        </span>
                      </div>
                      {/* The day description - an honest summary of what is actually in it */}
                      <div className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-night/55">
                        {dayDescription(d, dst)}
                      </div>
                      {d.notes && <div className="mt-1 text-xs text-night/45">💡 {d.notes}</div>}
                    </button>
                  </li>
                );
              })}
            </ol>
        </PanelSection>
      )}

      {/* ---------- Print / PDF export: branded cover + days + footer ---------- */}
      {t && (
        <div className="hidden print:block">
          {/* Cover page */}
          <div className="print-cover">
            <div className="print-cover-rule" aria-hidden />
            <div className="print-cover-center">
              <Logo className="print-logo" />
              <p className="print-brand">
                טיול<span>+</span>
              </p>
              <h1>{t.name}</h1>
              <p className="print-meta">
                {daysHe(t.days.length)} · {totalStops} עצירות
                {formatHebrewRange(t.startDate, t.endDate)
                  ? ` · ${formatHebrewRange(t.startDate, t.endDate)}`
                  : ''}
              </p>
              <div className="print-cities">
                {Array.from(new Set(t.days.map((d) => d.citySlug))).map((slug) => {
                  const dst = destOf(slug);
                  return dst ? (
                    <span key={slug} className="print-city-chip">
                      {dst.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <p className="print-cover-foot">
              סוכן הנסיעות החכם · הופק {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* The days */}
          {t.days.map((d, i) => {
            const dst = destOf(d.citySlug);
            const prev = i > 0 ? t.days[i - 1] : null;
            const dayStops = d.placeIds
              .map((pid) => placeOf(d.citySlug, pid))
              .filter((p): p is Place => Boolean(p));
            return (
              <div key={d.id}>
                {prev && prev.citySlug !== d.citySlug && (
                  <p className="print-leg">
                    {legOf(prev.citySlug, d.citySlug).emoji} מעבר:{' '}
                    {destOf(prev.citySlug)?.name} ← {dst?.name} ·{' '}
                    {legOf(prev.citySlug, d.citySlug).label}
                  </p>
                )}
                <section className="print-day">
                  <header className="print-day-head">
                    <span className="print-day-num">{i + 1}</span>
                    <div>
                      <h2>
                        יום {i + 1} · {dst?.name}
                        {(() => {
                          const iso = dayDate(t, i);
                          return iso ? ` · ${formatHebrewDate(iso, { weekday: true })}` : '';
                        })()}
                      </h2>
                      <p className="print-day-desc">{dayDescription(d, dst)}</p>
                    </div>
                  </header>
                  {d.notes && <p className="print-day-notes">💡 {d.notes}</p>}
                  <ol className="print-stops">
                    {dayStops.map((p, j) => (
                      <li key={p.id} className="print-stop">
                        <span className="print-stop-num">{j + 1}</span>
                        <div className="print-stop-body">
                          <p className="print-stop-name">
                            {p.name}
                            {p.mustSee && (
                              <span className="print-stop-star" title="חובה לראות">
                                ★
                              </span>
                            )}
                            <span className="print-stop-local">{p.nameLocal}</span>
                          </p>
                          <p className="print-stop-cat">{categoryMeta[p.category].label}</p>
                          {p.description && (
                            <p className="print-stop-desc">{p.description}</p>
                          )}
                          {p.kosherNote && (
                            <p className="print-stop-kosher">✡️ {p.kosherNote}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {dayStops.length === 0 && (
                    <p className="print-day-notes">אין עדיין עצירות ביום הזה</p>
                  )}
                </section>
              </div>
            );
          })}

          {/* Shabbat annex: exactly the same computation as the panel (shabbatRows.ts) */}
          {(() => {
            const rows = shabbatRowsFor(t, destOf);
            if (rows.length === 0) return null;
            return (
              <section className="print-annex">
                <h2>🕯️ זמני שבת במסלול</h2>
                <ul>
                  {rows.map((s) => (
                    <li key={s.fridayIso}>
                      <strong>
                        שבת {inHe(s.cityName)} · יום {s.dayNumber} · {formatHebrewDate(s.fridayIso)}
                      </strong>
                      {s.candles && s.havdalah
                        ? ` — הדלקת נרות ${s.candles} · צאת השבת ${s.havdalah} (שעון מקומי)`
                        : ' — בדקו לוח זמנים מקומי'}
                    </li>
                  ))}
                </ul>
                <p className="print-annex-note">
                  מחושב אסטרונומית: נרות 18 דק׳ לפני השקיעה, צאת השבת לפי 8.5 מעלות - מנהגים
                  משתנים, בדקו עם הרב שלכם.
                </p>
              </section>
            );
          })()}

          {/* Kashrut annex: only when the preference is on - the same opt-in rule as the panel */}
          {t.preferences?.kosher === true &&
            (() => {
              const cities = Array.from(new Set(t.days.map((d) => d.citySlug)))
                .map((slug) => destOf(slug))
                .filter((d): d is NonNullable<typeof d> => Boolean(d))
                .map((dst) => ({
                  dst,
                  places: dst.places.filter((p) => p.category.startsWith('kosher')),
                }))
                .filter((c) => c.places.length > 0 || c.dst.practical?.kosherOverview);
              if (cities.length === 0) return null;
              return (
                <section className="print-annex">
                  <h2>✡️ כשרות בערי הטיול</h2>
                  {cities.map(({ dst, places }) => (
                    <div key={dst.slug} className="print-annex-city">
                      <h3>{dst.name}</h3>
                      {dst.practical?.kosherOverview && <p>{dst.practical.kosherOverview}</p>}
                      {places.length > 0 && (
                        <ul>
                          {places.map((p) => (
                            <li key={p.id}>
                              <strong>{p.name}</strong>
                              {p.kosherVerification?.supervision
                                ? ` — השגחה: ${p.kosherVerification.supervision} · לוודא מול המקום`
                                : ' — לוודא מול המקום'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              );
            })()}

          {/* Footer: disclaimer + BlackZ signature */}
          <div className="print-footer">
            <p className="print-disclaimer">
              הטיול תוכנן בעזרת AI · לוודא כשרות, שעות ומחירים מול המקומות עצמם לפני הנסיעה
              <br />
              הופק ע&quot;י טיול+
            </p>
            <div className="print-signature">
              <blackz-signature></blackz-signature>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ---------- Mobile: sticky conversation bar + drawer ---------- */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-3 end-3 start-20 z-40 flex items-center gap-2 rounded-2xl bg-shell px-4 py-3 text-start shadow-[0_10px_30px_-12px_rgba(36,27,77,0.5)] ring-1 ring-night/15 lg:hidden print:hidden"
      >
        {/* The bar stays clickable offline too - the saved conversation is content
            worth reading. What changes is the invitation: it stops offering to
            write, and the circle loses its action colour so it does not look like
            an active button. */}
        <span className="truncate text-sm font-medium text-night/50">
          {chat.loading
            ? 'הסוכן עונה…'
            : offline
              ? 'הסוכן דורש חיבור · אפשר לקרוא את השיחה'
              : 'בקשה לסוכן: תוסיף יום, תחליף מקום…'}
        </span>
        <span
          className={`ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            offline ? 'bg-night/10 text-night/40' : 'bg-sunset text-cream'
          }`}
        >
          <span aria-hidden>💬</span>
        </span>
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden print:hidden">
          <button
            aria-label="סגירת השיחה"
            onClick={() => setChatOpen(false)}
            className="absolute inset-0 bg-night/40"
          />
          <div className="absolute inset-x-0 bottom-0 h-[82vh] rounded-t-3xl bg-shell p-2 shadow-[0_-10px_40px_-12px_rgba(36,27,77,0.5)]">
            <ChatPanel
              chat={chat}
              autoFocus
              coach={coach && online}
              onDismissCoach={dismissCoach}
              onClose={() => setChatOpen(false)}
              className="flex h-full ring-0"
            />
          </div>
        </div>
      )}

      {/* Import a map from Google My Maps -> saved as an explored destination + a new trip */}
      <ImportMapModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(dest, newTrip) => {
          chat.addExplored(dest);
          trip.createTripFrom(newTrip);
          setSelectedDayId(null);
          setMapMode('day');
        }}
      />

    </>
  );
}

/* Action icons - line style, inheriting currentColor, lucide-like. No dependency. */
const iconSvg = (paths: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 shrink-0"
    aria-hidden
  >
    {paths}
  </svg>
);

const ICONS = {
  duplicate: iconSvg(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  ),
  check: iconSvg(<path d="M20 6 9 17l-5-5" />),
  link: iconSvg(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>,
  ),
  whatsapp: iconSvg(
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.63 7.45L3 20l1.05-5.37A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9 10c.5 2.5 2.5 4.5 5 5l1.5-1.5" />
    </>,
  ),
  printer: iconSvg(
    <>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </>,
  ),
  trash: iconSvg(
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </>,
  ),
};

function Btn({
  children,
  onClick,
  danger = false,
  icon,
  iconClassName = '',
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  iconClassName?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-shell disabled:hover:ring-night/15 ${
        danger
          ? 'bg-shell text-sunset-deep ring-1 ring-night/10 hover:bg-sunset hover:text-cream'
          : 'bg-shell text-night ring-1 ring-night/15 hover:bg-night/5 hover:ring-night/30'
      }`}
    >
      {icon && <span className={`opacity-80 ${iconClassName}`}>{icon}</span>}
      {children}
    </button>
  );
}

/** The opening hint is shown once per browser */
const COACH_KEY = 'tiyul-plus:coach:agent';

/**
 * A small menu: one button that opens a list of actions.
 *
 * Built to shrink the trip screen. The measurement that led to it: 54 clickable
 * controls on the first screen at 1440 and 32 at 390, with no ranking between
 * them - which is what made the founder describe the screen as "flying an
 * aeroplane". The menu holds the actions a first-time traveller does not need,
 * without removing them.
 *
 * A real button and not hover: hover does not exist on touch, and keyboard
 * navigation must reach every action. No new dependency - the same approach as
 * the dropdown in PromptChips.
 */
function Menu({
  label,
  ariaLabel,
  icon,
  items,
  compact = false,
  chip = false,
  chipActive = false,
}: {
  label: string;
  ariaLabel: string;
  icon?: React.ReactNode;
  compact?: boolean;
  /** Looks like a preference chip rather than an action button */
  chip?: boolean;
  chipActive?: boolean;
  items: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    /** Ticked as the current value */
    selected?: boolean;
    /** A separator rule above it - for destructive actions */
    separated?: boolean;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const usable = items.filter((it) => !it.disabled);
  if (usable.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        title={ariaLabel}
        className={
          compact
            ? 'flex h-7 w-7 items-center justify-center rounded-full text-night/35 transition hover:bg-night/5 hover:text-night'
            : chip
              ? `rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  chipActive
                    ? 'bg-sunset text-cream'
                    : 'bg-night/5 text-night/50 hover:bg-night/10 hover:text-night'
                }`
              : 'inline-flex items-center gap-1.5 rounded-xl bg-shell px-3.5 py-2 text-sm font-semibold text-night ring-1 ring-night/15 transition hover:bg-night/5 hover:ring-night/30'
        }
      >
        {icon && <span className="opacity-80">{icon}</span>}
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl bg-shell py-1 shadow-pop ring-1 ring-night/15"
        >
          {usable.map((it, i) => (
            <div key={it.label}>
              {it.separated && i > 0 && <div className="my-1 border-t border-night/10" />}
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-start text-sm font-semibold transition ${
                  it.danger
                    ? 'text-sunset-deep hover:bg-sunset/10'
                    : it.selected
                      ? 'bg-sunset/10 text-sunset-deep'
                      : 'text-night/80 hover:bg-night/5 hover:text-night'
                }`}
              >
                {it.icon && <span className="opacity-70">{it.icon}</span>}
                {it.label}
                {it.selected && (
                  <span aria-hidden className="ms-auto text-xs">
                    ✓
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A preference chip that opens into a list of values. `undefined` clears the
 * preference - an explicit row ("no preference") rather than another step around
 * a cycle, because "I did not choose" is a real state the agent reads and not
 * merely an absence.
 */
function PrefSelect<T extends string>({
  label,
  current,
  options,
  onPick,
  disabled = false,
}: {
  label: string;
  current: T | undefined;
  options: { value: T; label: string }[];
  onPick: (v: T | undefined) => void;
  disabled?: boolean;
}) {
  const currentLabel = options.find((o) => o.value === current)?.label;
  return (
    <Menu
      chip
      chipActive={Boolean(current)}
      ariaLabel={`בחירת ${label}`}
      label={currentLabel ? `${label}: ${currentLabel}` : label}
      items={[
        ...options.map((o) => ({
          label: o.label,
          selected: o.value === current,
          disabled,
          onClick: () => onPick(o.value),
        })),
        ...(current
          ? [{ label: 'בלי העדפה', separated: true, disabled, onClick: () => onPick(undefined) }]
          : []),
      ]}
    />
  );
}

function PrefChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60">
      {label}
    </span>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
  disabled = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? OFFLINE_HINT : undefined}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        active ? 'bg-sunset text-cream' : 'bg-night/5 text-night/50 hover:bg-night/10'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * The "this day / whole trip" switch - floating on the map in the corner,
 * because it is a control of the map. Rendered only when there is more than one
 * day to draw at all (the parent decides).
 */
function MapModeSwitch({
  mode,
  dayLabel,
  onMode,
}: {
  mode: 'day' | 'trip';
  dayLabel: string;
  onMode: (m: 'day' | 'trip') => void;
}) {
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[1001] print:hidden">
      <div className="pointer-events-auto inline-flex rounded-full bg-shell/95 p-0.5 shadow-[0_2px_10px_-4px_rgba(36,27,77,0.45)] ring-1 ring-night/10 backdrop-blur-[2px]">
        <button
          onClick={() => onMode('day')}
          aria-pressed={mode === 'day'}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            mode === 'day' ? 'bg-night/10 text-night' : 'text-night/50 hover:text-night'
          }`}
        >
          {dayLabel}
        </button>
        <button
          onClick={() => onMode('trip')}
          aria-pressed={mode === 'trip'}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            mode === 'trip' ? 'bg-night/10 text-night' : 'text-night/50 hover:text-night'
          }`}
        >
          כל הטיול
        </button>
      </div>
    </div>
  );
}
