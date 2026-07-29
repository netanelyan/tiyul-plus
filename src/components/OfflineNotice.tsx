'use client';

import { useEffect, useMemo } from 'react';
import { isoDay, useOnline } from '@/lib/offline/online';
import { loadCities } from '@/lib/trip/cityStore';
import { formatHebrewDate } from '@/lib/trip/dates';

/**
 * שני דברים קטנים שחייבים לחיות ב-layout: רישום ה-service worker,
 * והשורה שאומרת למשתמש איפה הוא עומד.
 *
 * **הפס הוא שורה בזרימת העמוד ולא אלמנט צף.** זה גם שקט יותר (אין
 * חפיפה על תוכן, אין הבהוב) וגם עוקף את המלכודת שכבר תועדה כאן
 * פעמיים: `position: fixed` בתוך ה-header נמדד מול ה-header בגלל
 * ה-backdrop-blur, ולא מול המסך.
 *
 * הניסוח נבחר כדי לא להיקרא כתקלה של האתר: אין "שגיאה", אין אדום,
 * ויש אמירה חיובית - מה כן עובד עכשיו.
 */
export default function OfflineNotice() {
  const online = useOnline();
  /**
   * מתי נשמר התוכן הישן ביותר שיש במכשיר. זה **חייב** להיות על המסך:
   * תוכן שנשמר לפני שבוע כולל גם מידע כשרות ומחירים, והצגתו בלי תאריך
   * היא בדיוק הכישלון הגרוע ביותר שהפיצ׳ר הזה יכול לייצר. נקרא רק
   * כשאין רשת, אחרי הרינדור הראשון, כדי לא לגעת ב-localStorage
   * בשרת ולא ליצור אי-התאמת hydration.
   */
  const savedAt = useMemo(() => {
    if (online || typeof window === 'undefined') return null;
    const times = Object.values(loadCities()).map((e) => e.cachedAt);
    return times.length ? Math.min(...times) : null;
  }, [online]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // בפיתוח לא רושמים: ה-HMR של Turbopack וה-SW נלחמים על אותן
    // בקשות, וזה מייצר "באגים" שאינם קיימים בפרודקשן.
    if (process.env.NODE_ENV !== 'production') return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // דפדפן שחוסם SW (גלישה פרטית בחלק מהדפדפנים) - האתר עובד
        // בדיוק כמו קודם, פשוט בלי מצב לא-מקוון.
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="w-full border-b border-night/10 bg-night/[0.04] px-4 py-2 text-center text-xs text-night/70"
    >
      <span className="font-semibold">אין חיבור לאינטרנט.</span>{' '}
      מוצג המסלול שנשמר במכשיר
      {savedAt !== null && ` ב־${formatHebrewDate(isoDay(savedAt), { year: true })}`} - אפשר
      לקרוא אותו, לא לערוך.
    </div>
  );
}
