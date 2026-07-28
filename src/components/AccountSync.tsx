'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSupabase } from '@/lib/auth/client';
import { useTrip } from '@/lib/trip/TripContext';
import { mergeTrips, pullRemoteTrips, pushTrips, writeTombstones } from '@/lib/trip/sync';

/**
 * רכיב בלתי-נראה שמסנכרן את הטיולים עם החשבון:
 * - בהתחברות: משיכה מהשרת, מיזוג "המאוחר מנצח" מול המקומי (הטיולים
 *   המקומיים הקיימים עולים לחשבון אוטומטית - זו גם ההגירה הראשונית),
 * - בכל שינוי מקומי: דחיפה עם debounce של 1.5ש',
 * - מחיקה מקומית נכתבת כשורת מצבה בשרת (ראו ההסבר ב-`sync.ts`); זו
 *   הפעולה שמונעת מהטיול לחזור לחיים אחרי רענון.
 * יושב בתוך שני הפרוביידרים (layout) ולא נוגע בשום קומפוננטה אחרת.
 */
export default function AccountSync() {
  const { user, ready } = useAuth();
  const trip = useTrip();

  const pulledForUser = useRef<string | null>(null);
  const pullDone = useRef(false);
  const knownTombstones = useRef<Record<string, number>>({});
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // הטיולים שהוחלו עכשיו מהשרת - כדי לא לדחוף אותם מיד בחזרה בסבב הבא
  const applyingRef = useRef(false);
  const tripsRef = useRef(trip.trips);
  tripsRef.current = trip.trips;
  const deletedRef = useRef(trip.deleted);
  deletedRef.current = trip.deleted;

  // התחברות/החלפת משתמש: משיכה + מיזוג + הגירת טיולים מקומיים
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !ready || !trip.hydrated) return;
    if (!user) {
      pulledForUser.current = null;
      pullDone.current = false;
      knownTombstones.current = {};
      return;
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;

    (async () => {
      const pulled = await pullRemoteTrips(supabase);
      // בין כה ובין כה המשיכה הסתיימה: מכאן והלאה מחיקה חדשה נכתבת מיד
      // ע"י האפקט השני, ולא מחכה למשיכה שכבר לא תבוא.
      pullDone.current = true;
      if (pulled === null) return; // שגיאת רשת - ננסה שוב בשינוי הבא
      // **קוראים את המצבות המקומיות דרך ה-ref ולא מהסגור של האפקט.** בזה
      // בדיוק היה הבאג: המשיכה יוצאת לדרך, המשתמש מוחק טיול בזמן שהיא
      // באוויר, והמיזוג חישב מול מצב מלפני המחיקה.
      const { applyLocally, pushRemotely, writeRemotely, applyDeletions } = mergeTrips(
        tripsRef.current,
        pulled.trips,
        deletedRef.current,
        pulled.tombstones,
      );
      applyingRef.current = applyLocally.length > 0;
      for (const t of applyLocally) trip.upsertTrip(t);
      if (Object.keys(applyDeletions).length > 0) trip.applyRemoteDeletions(applyDeletions);
      if (Object.keys(writeRemotely).length > 0) {
        if (await writeTombstones(supabase, writeRemotely))
          knownTombstones.current = { ...knownTombstones.current, ...writeRemotely };
      }
      for (const [id, at] of Object.entries(pulled.tombstones)) knownTombstones.current[id] = at;
      if (pushRemotely.length > 0) await pushTrips(supabase, pushRemotely);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready, trip.hydrated]);

  // כל שינוי מקומי: דחיפה (debounced) + כתיבת מצבות למחיקות חדשות
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user || !trip.hydrated) return;

    // מצבה חדשה = מחיקה שהשרת עוד לא יודע עליה. נגזרת מהמצבות עצמן ולא
    // מהפרש בין שני רנדרים: אחרי רענון אין "רנדר קודם", והגרסה הקודמת
    // פשוט לא שלחה כלום במצב הזה.
    const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const fresh = Object.fromEntries(
      Object.entries(trip.deleted)
        .filter(([id, at]) => (knownTombstones.current[id] ?? 0) < at && now - at < RECENT_MS)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50),
    );
    if (pullDone.current && Object.keys(fresh).length > 0) {
      void writeTombstones(supabase, fresh).then((ok) => {
        if (ok) knownTombstones.current = { ...knownTombstones.current, ...fresh };
      });
    }

    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const live = tripsRef.current.filter(
        (t) => (deletedRef.current[t.id] ?? 0) < (t.updatedAt ?? t.createdAt),
      );
      void pushTrips(supabase, live);
    }, 1500);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.trips, trip.deleted, user, trip.hydrated]);

  return null;
}
