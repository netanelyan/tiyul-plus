'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import HeroPrompt from '@/components/HeroPrompt';
import TripWorkspace from '@/components/TripWorkspace';

/**
 * חוויית הסוכן - הכוכב של האתר.
 *
 * שני מצבים בלבד:
 * 1. landing - שדה קלט אחד גדול במרכז המסך + צ׳יפים של הצעות (כשאין טיול
 *    פעיל ולא התחילה שיחה). מינימליסטי בכוונה.
 * 2. התצוגה המאוחדת (TripWorkspace) - מסך אחד עם המסלול, המפה והשיחה
 *    יחד. אין יותר "טאב צ׳אט" נפרד מ"טאב תוכנית": /planner מרנדר את
 *    אותו רכיב בדיוק, על אותו Trip object.
 */
export default function AgentWorkspace() {
  const trip = useTrip();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  // הבקשה הראשונה שממתינה לשליחה בתוך התצוגה המאוחדת (הגעה מדף הבית)
  const [pending, setPending] = useState<{ q?: string; kosher?: boolean }>({});
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const paramsHandled = useRef(false);

  // הגעה מדף הבית / מטאב טיול בניווט: /chat?q=…&kosher=1 או /chat?trip=<id>.
  // window.location במקום useSearchParams כדי לא לחייב Suspense ב-prerender.
  useEffect(() => {
    if (paramsHandled.current) return;
    paramsHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const kosher = params.get('kosher') === '1';
    const tripId = params.get('trip');
    if (q || kosher || tripId) router.replace('/chat');
    if (tripId) {
      setPendingTripId(tripId);
      setStarted(true);
    }
    if (q && q.trim()) {
      setPending({ q: q.trim(), kosher });
      setStarted(true);
    } else if (kosher) {
      setPending({ kosher });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?trip= מוחל רק אחרי ההידרציה של TripProvider - אחרת הטעינה מהאחסון
  // (שרצה אחרי האפקטים של הילדים) הייתה דורסת את הבחירה.
  useEffect(() => {
    if (!trip.hydrated || !pendingTripId) return;
    if (pendingTripId !== trip.currentId) trip.setCurrentId(pendingTripId);
    setPendingTripId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.hydrated, pendingTripId]);

  /** מתחילים שיחה חדשה בלי לנטוש את הטיול הקיים - הוא נשאר כטאב ב-SiteNav */
  function startNewTrip() {
    trip.setCurrentId(null);
    setPending({});
    setStarted(false);
  }

  // יש טיול פעיל? זו כבר התצוגה המאוחדת - אין מסך נחיתה מעל טיול קיים.
  const showWorkspace = started || Boolean(trip.currentTrip);

  if (!showWorkspace) {
    return (
      <div className="flex min-h-[calc(100vh-230px)] flex-col items-center justify-center py-10">
        <h1 className="display rise-in text-center text-4xl text-night sm:text-6xl">
          לאן טסים הפעם?
        </h1>
        <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
          מספרים לי מה מדמיינים - ואני בונה טיול אמיתי, יום-אחרי-יום, על מפה. בעברית.
        </p>

        {/* קלט + צ׳יפים משותפים - צ׳יפ ממלא לעריכה, שליחה מתחילה את השיחה */}
        <HeroPrompt
          onSubmit={(text, kosher) => {
            setPending({ q: text, kosher });
            setStarted(true);
          }}
        />

        <div className="rise-in-late mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-night/40">
          <Link href="/countries" className="transition hover:text-sunset-deep">
            או גולשים בקטלוג היעדים ←
          </Link>
          <Link href="/planner" className="transition hover:text-sunset-deep">
            מעדיפים לבנות עם כפתורים? למתכנן ←
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TripWorkspace
      onNewTrip={startNewTrip}
      initialQuery={pending.q}
      initialKosher={pending.kosher}
    />
  );
}
