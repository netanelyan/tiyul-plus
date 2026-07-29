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
  currentId: string | null;
  hydrated: boolean;
  /**
   * id של טיול שנמחק → מתי. שכבת הסנכרון קוראת מכאן כדי לא להחזיר לחיים
   * טיול שנמחק (ראו ההסבר ב-`storage.ts`).
   */
  deleted: Record<string, number>;
  /**
   * טיולים שהגיעו מהשרת: מוחלים **כפי שהם**, בלי חותמת חדשה ובלי לגעת
   * בטיול הפתוח. שימוש ב-`upsertTrip` כאן הוא הבאג שהחזיר טיולים מחוקים
   * לחיים - ראו את ההסבר המלא ליד המימוש.
   */
  applyRemoteTrips: (trips: Trip[]) => void;
  /**
   * מצבות שהגיעו מהשרת (מכשיר אחר מחק): מוחק מקומית ורושם את המצבה, אלא
   * אם הגרסה המקומית נערכה **אחרי** המחיקה - אז העריכה המאוחרת מנצחת,
   * בדיוק כמו בכל מיזוג אחר.
   */
  applyRemoteDeletions: (tombstones: Record<string, number>) => void;
  setCurrentId: (id: string | null) => void;
  createTrip: (name: string, citySlug?: string) => Trip;
  createTripFrom: (trip: Trip) => void; // מוסיף טיול מוכן (אשף/תבנית)
  upsertTrip: (trip: Trip) => void; // מחליף לפי id או מוסיף - עדכונים מהסוכן
  duplicateTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  renameTrip: (id: string, name: string) => void;
  /** תאריכי הטיול. `undefined` בשדה = ניקוי אותו קצה. */
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
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);
  // הערך העדכני באופן סינכרוני - נדרש כדי להחליט על currentId בלי להסתמך
  // על ה-updater של React (אותה מלכודת שתוקנה כבר ב-AuthContext)
  const tripsRef = useRef<Trip[]>(trips);
  tripsRef.current = trips;

  // טעינה ראשונית מהדפדפן (אחרי mount, כדי לא לשבור SSR)
  useEffect(() => {
    const state = loadTrips();
    setTrips(state.trips);
    setCurrentId(state.currentId);
    setDeleted(state.deleted ?? {});
    loaded.current = true;
    setHydrated(true);
  }, []);

  // שמירה על כל שינוי
  useEffect(() => {
    if (!loaded.current) return;
    saveTrips({ trips, currentId, deleted });
  }, [trips, currentId, deleted]);

  const currentTrip = trips.find((t) => t.id === currentId) ?? null;

  // כל מוטציה מקומית מקבלת חותמת updatedAt - שכבת הסנכרון ממזגת לפי
  // "המאוחר מנצח" בין מכשירים. **מצב שמגיע מהשרת אינו מוטציה** ואסור לו
  // לקבל חותמת חדשה; הוא עובר דרך `applyRemoteTrips`.
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
      return trip;
    },
    [],
  );

  /** הוספה/עדכון מקומיים מפורשים מבטלים מצבה קיימת - מי שיצר מנצח מחיקה ישנה */
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
    },
    [clearTombstone],
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
    },
    [clearTombstone],
  );

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
        updatedAt: Date.now(),
      };
      setCurrentId(copy.id);
      return [...prev, copy];
    });
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setCurrentId((cur) => (cur === id ? null : cur));
    // המצבה נרשמת יחד עם המחיקה, לא אחריה: היא מה שמונע החזרה לחיים
    // ע"י משיכה מהשרת שכבר הייתה באוויר כשהמשתמש לחץ מחיקה.
    setDeleted((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  /**
   * החלת טיולים שהגיעו מהשרת - **בלי להתחזות לעריכה**.
   *
   * `upsertTrip` חותם `updatedAt: Date.now()` בכוונה, כי הוא נקרא כשמישהו
   * באמת שינה משהו. `AccountSync` השתמש בו גם כדי להחיל את תוצאת המשיכה,
   * ובזה נשבר כל מנגנון המצבות: **עצם ההתחברות במכשיר שני הפכה טיול ישן
   * ל"נערך עכשיו"**, הדחיפה שאחריה כתבה אותו לשרת עם חותמת מאוחרת מהמחיקה,
   * והמיזוג - בצדק, לפי הכלל "עריכה מאוחרת מנצחת" - החזיר אותו לחיים בכל
   * המכשירים. זה מה שנתנאל ראה: מחק שניים, והם חזרו.
   *
   * לכן כאן: החותמת נשמרת כפי שהגיעה, המצבה **לא** נמחקת (רק יצירה או
   * עריכה מקומית מפורשת מבטלות מצבה), וה-currentId לא נחטף - התחברות לא
   * אמורה להחליף למשתמש את הטיול הפתוח.
   */
  const applyRemoteTrips = useCallback((incoming: Trip[]) => {
    if (incoming.length === 0) return;
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
        return (t.updatedAt ?? t.createdAt) > at; // נערך אחרי המחיקה - נשאר
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
   * תאריכי הטיול. **לא נוגע בימים** בכוונה: אם הטווח ארוך או קצר
   * ממספר הימים, המסך אומר את זה ומציע פעולה מפורשת - בחירת תאריך
   * שמוחקת יום עם עצירות היא בדיוק סוג ההפתעה שאסורה כאן.
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
