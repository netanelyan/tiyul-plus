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

interface TripApi {
  trips: Trip[];
  currentTrip: Trip | null;
  hydrated: boolean;
  setCurrentId: (id: string | null) => void;
  createTrip: (name: string, citySlug?: string) => Trip;
  createTripFrom: (trip: Trip) => void; // מוסיף טיול מוכן (אשף/תבנית)
  upsertTrip: (trip: Trip) => void; // מחליף לפי id או מוסיף - עדכונים מהסוכן
  duplicateTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  renameTrip: (id: string, name: string) => void;
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
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  // טעינה ראשונית מהדפדפן (אחרי mount, כדי לא לשבור SSR)
  useEffect(() => {
    const state = loadTrips();
    setTrips(state.trips);
    setCurrentId(state.currentId);
    loaded.current = true;
    setHydrated(true);
  }, []);

  // שמירה על כל שינוי
  useEffect(() => {
    if (!loaded.current) return;
    saveTrips({ trips, currentId });
  }, [trips, currentId]);

  const currentTrip = trips.find((t) => t.id === currentId) ?? null;

  const update = useCallback((id: string, fn: (t: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
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
      };
      setTrips((prev) => [...prev, trip]);
      setCurrentId(trip.id);
      return trip;
    },
    [],
  );

  const createTripFrom = useCallback((trip: Trip) => {
    setTrips((prev) => [...prev, trip]);
    setCurrentId(trip.id);
  }, []);

  const upsertTrip = useCallback((trip: Trip) => {
    setTrips((prev) =>
      prev.some((t) => t.id === trip.id)
        ? prev.map((t) => (t.id === trip.id ? trip : t))
        : [...prev, trip],
    );
    setCurrentId(trip.id);
  }, []);

  const duplicateTrip = useCallback((id: string) => {
    setTrips((prev) => {
      const src = prev.find((t) => t.id === id);
      if (!src) return prev;
      const copy: Trip = {
        ...src,
        id: newId(),
        name: `${src.name} (עותק)`,
        days: src.days.map((d) => ({ ...d, id: newId(), placeIds: [...d.placeIds] })),
        citySlugs: [...src.citySlugs],
        createdAt: Date.now(),
      };
      setCurrentId(copy.id);
      return [...prev, copy];
    });
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setCurrentId((cur) => (cur === id ? null : cur));
  }, []);

  const renameTrip = useCallback(
    (id: string, name: string) => update(id, (t) => ({ ...t, name })),
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

  /** מוסיף מקום ליום האחרון של העיר; יוצר טיול/יום אם צריך. מחזיר לאיזה יום נכנס. */
  const addPlace = useCallback(
    (citySlug: string, placeId: string): { dayIndex: number } => {
      let dayIndex = 0;
      if (!currentId) {
        // אין טיול פעיל - יוצרים אחד עם יום אחד לעיר הזו
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
        hydrated,
        setCurrentId,
        createTrip,
        createTripFrom,
        upsertTrip,
        duplicateTrip,
        deleteTrip,
        renameTrip,
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
