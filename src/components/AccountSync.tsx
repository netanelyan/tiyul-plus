'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSupabase } from '@/lib/auth/client';
import { useTrip } from '@/lib/trip/TripContext';
import { deleteRemoteTrips, mergeTrips, pullRemoteTrips, pushTrips } from '@/lib/trip/sync';

/**
 * רכיב בלתי-נראה שמסנכרן את הטיולים עם החשבון:
 * - בהתחברות: משיכה מהשרת, מיזוג "המאוחר מנצח" מול המקומי (הטיולים
 *   המקומיים הקיימים עולים לחשבון אוטומטית - זו גם ההגירה הראשונית),
 * - בכל שינוי מקומי: דחיפה עם debounce של 1.5ש',
 * - מחיקה מקומית מוחקת גם בשרת (RLS מגביל לשורות של המשתמש בלבד).
 * יושב בתוך שני הפרוביידרים (layout) ולא נוגע בשום קומפוננטה אחרת.
 */
export default function AccountSync() {
  const { user, ready } = useAuth();
  const trip = useTrip();

  const pulledForUser = useRef<string | null>(null);
  const prevIds = useRef<Set<string> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // הטיולים שהוחלו עכשיו מהשרת - כדי לא לדחוף אותם מיד בחזרה בסבב הבא
  const applyingRef = useRef(false);
  const tripsRef = useRef(trip.trips);
  tripsRef.current = trip.trips;

  // התחברות/החלפת משתמש: משיכה + מיזוג + הגירת טיולים מקומיים
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !ready || !trip.hydrated) return;
    if (!user) {
      pulledForUser.current = null;
      return;
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;

    (async () => {
      const remote = await pullRemoteTrips(supabase);
      if (remote === null) return; // שגיאת רשת - ננסה שוב בשינוי הבא
      const { applyLocally, pushRemotely } = mergeTrips(tripsRef.current, remote);
      applyingRef.current = applyLocally.length > 0;
      for (const t of applyLocally) trip.upsertTrip(t);
      if (pushRemotely.length > 0) await pushTrips(supabase, pushRemotely);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready, trip.hydrated]);

  // כל שינוי מקומי: דחיפה (debounced) + סנכרון מחיקות
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user || !trip.hydrated) return;

    const currentIds = new Set(trip.trips.map((t) => t.id));
    const deleted: string[] = [];
    if (prevIds.current) {
      for (const id of prevIds.current) if (!currentIds.has(id)) deleted.push(id);
    }
    prevIds.current = currentIds;

    if (deleted.length > 0) void deleteRemoteTrips(supabase, deleted);

    // ההחלה מהשרת עצמה לא צריכה דחיפה מלאה מיידית - אבל גם אם תקרה,
    // התוכן זהה (הד יחיד). מוותרים רק על הסבב שסומן במפורש.
    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void pushTrips(supabase, tripsRef.current);
    }, 1500);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.trips, user, trip.hydrated]);

  return null;
}
