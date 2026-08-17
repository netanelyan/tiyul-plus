'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Trip, TripDay } from './types';
import { newId } from './types';
import { loadTrips, saveTrips } from './storage';
import { trackTripCreated } from '@/lib/events';

export interface TripApi {
  trips: Trip[];
  currentTrip: Trip | null;
  currentId: string | null;
  hydrated: boolean;
  /**
   * id of a deleted trip → when. The sync layer reads from here so it
   * does not resurrect a deleted trip (see the explanation in
   * `storage.ts`).
   */
  deleted: Record<string, number>;
  /**
   * Trips that came from the server: applied **as they are**, with no
   * new stamp and without touching the open trip. Using `upsertTrip`
   * here is the bug that brought deleted trips back to life - see the
   * full explanation next to the implementation.
   */
  applyRemoteTrips: (trips: Trip[]) => void;
  /**
   * Tombstones that came from the server (another device deleted):
   * deletes locally and records the tombstone, unless the local version
   * was edited **after** the deletion - then the later edit wins,
   * exactly like in every other merge.
   */
  applyRemoteDeletions: (tombstones: Record<string, number>) => void;
  setCurrentId: (id: string | null) => void;
  /**
   * **Who owns the local storage right now** (`null` = anonymous), and
   * switching to another account. See the full explanation next to the
   * implementation - this is a fix for switching between people on a
   * shared device, not state management.
   */
  accountId: string | null;
  switchAccount: (userId: string | null) => boolean;
  createTrip: (name: string, citySlug?: string) => Trip;
  createTripFrom: (trip: Trip) => void; // adds a ready-made trip (wizard/template)
  upsertTrip: (trip: Trip) => void; // replaces by id or adds - updates from the agent
  duplicateTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  renameTrip: (id: string, name: string) => void;
  /** Trip dates. `undefined` in a field = clearing that end. */
  setTripDates: (id: string, dates: { startDate?: string; endDate?: string }) => void;
  addDay: (citySlug: string) => void;
  removeDay: (dayId: string) => void;
  setDayNotes: (dayId: string, notes: string) => void;
  addPlace: (citySlug: string, placeId: string) => { dayIndex: number };
  removePlace: (dayId: string, placeId: string) => void;
  movePlace: (dayId: string, index: number, dir: -1 | 1) => void;
  movePlaceToDay: (fromDayId: string, placeId: string, toDayId: string) => void;
}

const Ctx = createContext<TripApi | null>(null);

export function useTrip(): TripApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useTrip must be used inside <TripProvider>');
  return api;
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Record<string, number>>({});
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);
  // The synchronously up-to-date value - needed to decide on currentId without
  // relying on React's updater (the same trap already fixed in AuthContext)
  const tripsRef = useRef<Trip[]>(trips);
  tripsRef.current = trips;
  /**
   * The trip ids already known to this browser - the basis for the
   * "trips created" counter.
   *
   * A ref, not state: the check must be synchronous and outside React's
   * updater (an updater must be pure, and StrictMode runs it twice).
   * The rule: a local mutation adding an unknown id is counted once;
   * whatever comes from the server (applyRemoteTrips) or from hydration
   * enters the set **without** being counted - a restore is not a
   * creation.
   */
  const knownIdsRef = useRef<Set<string>>(new Set());
  const noteCreated = useCallback((id: string) => {
    if (knownIdsRef.current.has(id)) return;
    knownIdsRef.current.add(id);
    trackTripCreated();
  }, []);
  /** The synchronously current accountId - see `switchAccount` */
  const accountRef = useRef<string | null>(null);

  // Initial load from the browser (after mount, so as not to break SSR)
  useEffect(() => {
    const state = loadTrips();
    setTrips(state.trips);
    setCurrentId(state.currentId);
    setDeleted(state.deleted ?? {});
    setAccountId(state.accountId ?? null);
    accountRef.current = state.accountId ?? null;
    // Trips already in storage were not "created now" - they enter the set without being counted
    for (const t of state.trips) knownIdsRef.current.add(t.id);
    loaded.current = true;
    setHydrated(true);
  }, []);

  // Save on every change
  useEffect(() => {
    if (!loaded.current) return;
    saveTrips({ trips, currentId, deleted, accountId });
  }, [trips, currentId, deleted, accountId]);

  const currentTrip = trips.find((t) => t.id === currentId) ?? null;

  /**
   * Switching between accounts on the same browser.
   *
   * **The bug this closes:** signing out left the trips in local
   * storage, so the next login - by a different person on the same
   * computer - merged them. `mergeTrips` pushes to the server every
   * local trip that does not exist in the account, and that is exactly
   * the shape of the previous person's trip. The result: their trips
   * land in someone else's account.
   *
   * The rule here is simple: **trips that belong to an account vanish
   * from the device when you sign out of it.** They are not lost - they
   * are in the account, and come back on the next login. Anonymous
   * trips (accountId === null) stay, because they have nowhere else to
   * live, and that is also the first-login migration.
   */
  const switchAccount = useCallback((userId: string | null): boolean => {
    const prev = accountRef.current;
    if (prev === userId) return false;
    accountRef.current = userId;
    setAccountId(userId);
    // Out of an account, or from one account to another: what is here does not belong to the person coming in
    const clearing = prev !== null;
    if (clearing) {
      tripsRef.current = [];
      setTrips([]);
      setCurrentId(null);
      setDeleted({});
    }
    /*
      **Returned synchronously on purpose.** `setTrips` does not update
      until the next render, and the sync layer merges immediately after
      this call - meaning without a return value it would merge the
      previous person's list and push it into the new account, which is
      exactly the bug. `AccountSync` checks this value.
    */
    return clearing;
  }, []);

  // Every local mutation gets an updatedAt stamp - the sync layer merges by
  // "latest wins" across devices. **State coming from the server is not a
  // mutation** and must not get a new stamp; it goes through `applyRemoteTrips`.
  const update = useCallback((id: string, fn: (t: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...fn(t), updatedAt: Date.now() } : t)));
  }, []);

  const createTrip = useCallback(
    (name: string, citySlug?: string): Trip => {
      const trip: Trip = {
        id: newId(),
        name,
        citySlugs: citySlug ? [citySlug] : [],
        days: citySlug
          ? [{ id: newId(), citySlug, placeIds: [] }]
          : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTrips((prev) => [...prev, trip]);
      setCurrentId(trip.id);
      noteCreated(trip.id);
      return trip;
    },
    [noteCreated],
  );

  /** An explicit local add/update cancels an existing tombstone - a creator beats an old deletion */
  const clearTombstone = useCallback((id: string) => {
    setDeleted((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createTripFrom = useCallback(
    (trip: Trip) => {
      const stamped = { ...trip, updatedAt: Date.now() };
      setTrips((prev) => [...prev, stamped]);
      setCurrentId(stamped.id);
      clearTombstone(stamped.id);
      noteCreated(stamped.id);
    },
    [clearTombstone, noteCreated],
  );

  const upsertTrip = useCallback(
    (trip: Trip) => {
      const stamped = { ...trip, updatedAt: Date.now() };
      setTrips((prev) =>
        prev.some((t) => t.id === stamped.id)
          ? prev.map((t) => (t.id === stamped.id ? stamped : t))
          : [...prev, stamped],
      );
      setCurrentId(stamped.id);
      clearTombstone(stamped.id);
      // Counted only when the id is new - the agent calls this over and over
      // during a build with the same trip, and the Set is what makes it one event
      noteCreated(stamped.id);
    },
    [clearTombstone, noteCreated],
  );

  /*
    The copy's id is created **outside** the updater: the updater must
    be pure (StrictMode runs it twice), and noteCreated is a side
    effect. tripsRef gives the current list synchronously - the same
    pattern as switchAccount above.
  */
  const duplicateTrip = useCallback(
    (id: string) => {
      const src = tripsRef.current.find((t) => t.id === id);
      if (!src) return;
      const copy: Trip = {
        ...src,
        id: newId(),
        name: `${src.name} (עותק)`,
        days: src.days.map((d) => ({ ...d, id: newId(), placeIds: [...d.placeIds] })),
        citySlugs: [...src.citySlugs],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTrips((prev) => [...prev, copy]);
      setCurrentId(copy.id);
      noteCreated(copy.id);
    },
    [noteCreated],
  );

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setCurrentId((cur) => (cur === id ? null : cur));
    // The tombstone is recorded together with the deletion, not after it: it is
    // what prevents resurrection by a server pull that was already in flight
    // when the user clicked delete.
    setDeleted((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  /**
   * Applying trips that came from the server - **without impersonating
   * an edit**.
   *
   * `upsertTrip` stamps `updatedAt: Date.now()` on purpose, because it
   * is called when somebody actually changed something. `AccountSync`
   * also used it to apply the pull result, and that broke the whole
   * tombstone mechanism: **merely logging in on a second device turned
   * an old trip into "edited now"**, the push that followed wrote it to
   * the server with a stamp later than the deletion, and the merge -
   * correctly, per the "later edit wins" rule - brought it back to life
   * on every device. That is what Netanel saw: deleted two, and they
   * came back.
   *
   * Hence here: the stamp is kept as it arrived, the tombstone is
   * **not** cleared (only an explicit local creation or edit cancels a
   * tombstone), and currentId is not hijacked - logging in is not
   * supposed to swap the user's open trip.
   */
  const applyRemoteTrips = useCallback((incoming: Trip[]) => {
    if (incoming.length === 0) return;
    // A restore from the server is not a creation - the ids enter the known set
    // without being counted, so a future edit of them (upsertTrip) is not
    // counted as a "trip created"
    for (const t of incoming) knownIdsRef.current.add(t.id);
    setTrips((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of incoming) byId.set(t.id, t);
      return [...byId.values()];
    });
  }, []);

  const applyRemoteDeletions = useCallback((tombstones: Record<string, number>) => {
    const entries = Object.entries(tombstones);
    if (entries.length === 0) return;
    setDeleted((prev) => {
      const next = { ...prev };
      for (const [id, at] of entries) next[id] = Math.max(next[id] ?? 0, at);
      return next;
    });
    setTrips((prev) =>
      prev.filter((t) => {
        const at = tombstones[t.id];
        if (at === undefined) return true;
        return (t.updatedAt ?? t.createdAt) > at; // edited after the deletion - stays
      }),
    );
    setCurrentId((cur) => {
      if (!cur) return cur;
      const at = tombstones[cur];
      if (at === undefined) return cur;
      const local = tripsRef.current.find((t) => t.id === cur);
      const survived = local ? (local.updatedAt ?? local.createdAt) > at : false;
      return survived ? cur : null;
    });
  }, []);

  const renameTrip = useCallback(
    (id: string, name: string) => update(id, (t) => ({ ...t, name })),
    [update],
  );

  /**
   * Trip dates. **Deliberately does not touch the days**: if the range
   * is longer or shorter than the day count, the screen says so and
   * offers an explicit action - picking a date that deletes a day full
   * of stops is exactly the kind of surprise forbidden here.
   */
  const setTripDates = useCallback(
    (id: string, dates: { startDate?: string; endDate?: string }) =>
      update(id, (t) => ({ ...t, startDate: dates.startDate, endDate: dates.endDate })),
    [update],
  );

  const addDay = useCallback(
    (citySlug: string) => {
      if (!currentId) return;
      update(currentId, (t) => ({
        ...t,
        citySlugs: t.citySlugs.includes(citySlug)
          ? t.citySlugs
          : [...t.citySlugs, citySlug],
        days: [...t.days, { id: newId(), citySlug, placeIds: [] }],
      }));
    },
    [currentId, update],
  );

  const removeDay = useCallback(
    (dayId: string) => {
      if (!currentId) return;
      update(currentId, (t) => {
        const days = t.days.filter((d) => d.id !== dayId);
        return {
          ...t,
          days,
          citySlugs: t.citySlugs.filter((c) => days.some((d) => d.citySlug === c)),
        };
      });
    },
    [currentId, update],
  );

  const setDayNotes = useCallback(
    (dayId: string, notes: string) => {
      if (!currentId) return;
      update(currentId, (t) => ({
        ...t,
        days: t.days.map((d) => (d.id === dayId ? { ...d, notes } : d)),
      }));
    },
    [currentId, update],
  );

  /** Adds a place to the city's last day; creates a trip/day if needed. Returns which day it went into. */
  const addPlace = useCallback(
    (citySlug: string, placeId: string): { dayIndex: number } => {
      let dayIndex = 0;
      if (!currentId) {
        // No active trip - create one with a single day for this city
        const trip: Trip = {
          id: newId(),
          name: 'הטיול שלי',
          citySlugs: [citySlug],
          days: [{ id: newId(), citySlug, placeIds: [placeId] }],
          createdAt: Date.now(),
        };
        setTrips((prev) => [...prev, trip]);
        setCurrentId(trip.id);
        return { dayIndex: 0 };
      }
      update(currentId, (t) => {
        const cityDays = t.days.filter((d) => d.citySlug === citySlug);
        if (cityDays.length === 0) {
          const day: TripDay = { id: newId(), citySlug, placeIds: [placeId] };
          dayIndex = t.days.length;
          return {
            ...t,
            citySlugs: t.citySlugs.includes(citySlug)
              ? t.citySlugs
              : [...t.citySlugs, citySlug],
            days: [...t.days, day],
          };
        }
        const target = cityDays[cityDays.length - 1];
        dayIndex = t.days.findIndex((d) => d.id === target.id);
        return {
          ...t,
          days: t.days.map((d) =>
            d.id === target.id && !d.placeIds.includes(placeId)
              ? { ...d, placeIds: [...d.placeIds, placeId] }
              : d,
          ),
        };
      });
      return { dayIndex };
    },
    [currentId, update],
  );

  const removePlace = useCallback(
    (dayId: string, placeId: string) => {
      if (!currentId) return;
      update(currentId, (t) => ({
        ...t,
        days: t.days.map((d) =>
          d.id === dayId
            ? { ...d, placeIds: d.placeIds.filter((p) => p !== placeId) }
            : d,
        ),
      }));
    },
    [currentId, update],
  );

  const movePlace = useCallback(
    (dayId: string, index: number, dir: -1 | 1) => {
      if (!currentId) return;
      update(currentId, (t) => ({
        ...t,
        days: t.days.map((d) => {
          if (d.id !== dayId) return d;
          const target = index + dir;
          if (target < 0 || target >= d.placeIds.length) return d;
          const ids = [...d.placeIds];
          [ids[index], ids[target]] = [ids[target], ids[index]];
          return { ...d, placeIds: ids };
        }),
      }));
    },
    [currentId, update],
  );

  const movePlaceToDay = useCallback(
    (fromDayId: string, placeId: string, toDayId: string) => {
      if (!currentId) return;
      update(currentId, (t) => ({
        ...t,
        days: t.days.map((d) => {
          if (d.id === fromDayId)
            return { ...d, placeIds: d.placeIds.filter((p) => p !== placeId) };
          if (d.id === toDayId && !d.placeIds.includes(placeId))
            return { ...d, placeIds: [...d.placeIds, placeId] };
          return d;
        }),
      }));
    },
    [currentId, update],
  );

  return (
    <Ctx.Provider
      value={{
        trips,
        currentTrip,
        accountId,
        switchAccount,
        currentId,
        hydrated,
        deleted,
        applyRemoteTrips,
        applyRemoteDeletions,
        setCurrentId,
        createTrip,
        createTripFrom,
        upsertTrip,
        duplicateTrip,
        deleteTrip,
        renameTrip,
        setTripDates,
        addDay,
        removeDay,
        setDayNotes,
        addPlace,
        removePlace,
        movePlace,
        movePlaceToDay,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
