'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import HeroPrompt from '@/components/HeroPrompt';
import TripWorkspace from '@/components/TripWorkspace';
import ResumeTrips from '@/components/ResumeTrips';

/**
 * חוויית הסוכן - הכוכב של האתר.
 *
 * שני מצבים בלבד:
 * 1. landing - שדה קלט אחד גדול במרכז המסך + צ׳יפים של הצעות. מינימליסטי
 *    בכוונה, ועכשיו גם שורת "או ממשיכים טיול קיים".
 * 2. התצוגה המאוחדת (TripWorkspace) - מסך אחד עם המסלול, המפה והשיחה
 *    יחד. אין יותר "טאב צ׳אט" נפרד מ"טאב תוכנית": /planner מרנדר את
 *    אותו רכיב בדיוק, על אותו Trip object.
 *
 * ## **הטיול הפתוח יושב בכתובת, לא באחסון**
 *
 * זה תיקון של באג שנגע בכל משתמש: `currentId` נשמר ב-localStorage ולא
 * נוקה אף פעם, והמסך נבחר לפיו - כך שכל כניסה ל-/chat, מכל מקום, נפלה
 * לתוך הטיול הקודם. שאלה על נורווגיה נענתה בתוך טיול בסלובקיה, כי הטיול
 * הזה נשלח לשרת כהקשר ועריכות נכתבו לתוכו.
 *
 * הכלל עכשיו: `/chat` נקי הוא **תמיד שיחה חדשה** - ובכניסה כזאת
 * `currentId` מתאפס, כדי ששום דבר לא ייגרר. `/chat?trip=<id>` הוא היחיד
 * שפותח טיול קיים, והפרמטר **נשאר בכתובת**, כך שרענון נשאר באותו מקום.
 * מכאן גם ש"להמשיך" הוא תמיד קישור שמישהו לחץ עליו.
 */
/**
 * כתיבת הטיול הפתוח לכתובת, דרך ה-History API ולא דרך הראוטר.
 *
 * `router.replace` הוא ניווט רך: כשקוראים לו כדי רק להוריד פרמטר מאותו
 * עמוד הוא לא עדכן את הכתובת בפועל (נמדד - הפרמטר נשאר). ממילא המסך הזה
 * קורא את הפרמטרים מ-`window.location` ולא מ-`useSearchParams`, ולכן אין
 * כאן מצב ראוטר שיכול לצאת מסנכרון.
 */
function writeTripParam(id: string | null) {
  if (typeof window === 'undefined') return;
  const url = id ? `/chat?trip=${encodeURIComponent(id)}` : '/chat';
  if (window.location.pathname + window.location.search !== url)
    window.history.replaceState(null, '', url);
}

export default function AgentWorkspace() {
  const trip = useTrip();
  const [started, setStarted] = useState(false);
  // הבקשה הראשונה שממתינה לשליחה בתוך התצוגה המאוחדת (הגעה מדף הבית)
  const [pending, setPending] = useState<{ q?: string; kosher?: boolean }>({});
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const paramsHandled = useRef(false);
  /** נכנסנו עם ?trip= - כלומר בחירה מפורשת, ולא שיחה חדשה */
  const resuming = useRef(false);
  /**
   * הוכרע מה הטיול של הכניסה הזאת (או שאין כזה).
   *
   * **חייב לחסום את הרינדור של הסדנה, ולא רק להיות דגל.** אפקטים של ילד
   * רצים לפני אפקטים של הורה, ולכן `TripProvider` טוען מהאחסון רק אחרי
   * שהמסך הזה כבר עלה - כלומר בלי החסימה הזאת הסדנה הייתה נטענת לרגע עם
   * הטיול הישן ושולחת איתו את השאלה הראשונה. בדיוק הבאג, בגרסה מהירה.
   */
  const [entryResolved, setEntryResolved] = useState(false);

  // הגעה מדף הבית / מטאב טיול בניווט: /chat?q=…&kosher=1 או /chat?trip=<id>.
  // window.location במקום useSearchParams כדי לא לחייב Suspense ב-prerender.
  useEffect(() => {
    if (paramsHandled.current) return;
    paramsHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const kosher = params.get('kosher') === '1';
    const tripId = params.get('trip');
    // ?q= ו-?kosher= יורדים מהכתובת; ?trip= נשאר, הוא מה שמחזיק את המסך
    if (q || kosher) writeTripParam(tripId);
    if (tripId) {
      resuming.current = true;
      setPendingTripId(tripId);
      setStarted(true);
    }
    if (q && q.trim()) {
      setPending({ q: q.trim(), kosher });
      setStarted(true);
    } else if (kosher) {
      setPending({ kosher });
    }
     
  }, []);

  // ?trip= מוחל רק אחרי ההידרציה של TripProvider - אחרת הטעינה מהאחסון
  // (שרצה אחרי האפקטים של הילדים) הייתה דורסת את הבחירה.
  useEffect(() => {
    if (!trip.hydrated) return;
    if (pendingTripId) {
      if (pendingTripId !== trip.currentId) trip.setCurrentId(pendingTripId);
      setPendingTripId(null);
      setEntryResolved(true);
      return;
    }
    /*
      **כניסה נקייה = שיחה נקייה.** הטיול ששרד באחסון לא נבחר על ידי
      אף אחד בכניסה הזאת, ולכן הוא לא נפתח ולא נשלח כהקשר. הוא לא אבד -
      הוא ברשימת "ממשיכים טיול קיים" ובטאבים בניווט.
    */
    if (!resuming.current && trip.currentId) trip.setCurrentId(null);
    setEntryResolved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.hydrated, pendingTripId]);

  /*
    טיול שנוצר תוך כדי השיחה נכנס לכתובת. בלי זה רענון באמצע תכנון היה
    חוזר למסך הנחיתה - הכתובת היא מה שמחזיק את המסך, אז היא חייבת לדעת.
  */
  useEffect(() => {
    if (!trip.hydrated || !trip.currentId || pendingTripId) return;
    const now = new URLSearchParams(window.location.search).get('trip');
    if (now !== trip.currentId) {
      resuming.current = true;
      writeTripParam(trip.currentId);
    }
     
  }, [trip.hydrated, trip.currentId, pendingTripId]);

  /** מתחילים שיחה חדשה בלי לנטוש את הטיול הקיים - הוא נשאר כטאב ב-SiteNav */
  function startNewTrip() {
    resuming.current = false;
    trip.setCurrentId(null);
    setPending({});
    setStarted(false);
    writeTripParam(null);
  }

  /*
    **`trip.currentTrip` כבר לא מחליט את המסך.** זה היה הבאג: ערך שנשמר
    מפעם קודמת קבע לאן נוחתים. עכשיו רק פעולה בכניסה הזאת פותחת מסך -
    שאלה שנשלחה, או ?trip= שמישהו לחץ עליו.
  */
  const showWorkspace = started;

  // פריים אחד לכל היותר, עד שההידרציה הכריעה מה הטיול של הכניסה הזאת
  if (showWorkspace && !entryResolved) return null;

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

        <ResumeTrips className="rise-in-late mt-8" />

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
